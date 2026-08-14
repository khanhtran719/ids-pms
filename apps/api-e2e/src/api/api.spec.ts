import axios from 'axios';
import {
  TEST_ADMIN_EMAIL,
  TEST_ADMIN_PASSWORD,
  TEST_MEMBER_EMAIL,
  TEST_MEMBER_PASSWORD,
} from '../support/test-database';

const CSRF_HEADERS = { 'x-csrf-protection': '1' };
let lifecycleAdminAuthorization = { Authorization: '' };
let lifecycleMemberAuthorization = { Authorization: '' };
let lifecycleMemberId = '';

function readRefreshCookie(response: { headers: Record<string, unknown> }) {
  const setCookie = response.headers['set-cookie'];
  if (!Array.isArray(setCookie) || typeof setCookie[0] !== 'string') {
    throw new Error('Expected refresh cookie');
  }
  return setCookie[0];
}

function cookieHeader(setCookie: string): string {
  return setCookie.split(';', 1)[0];
}

describe('GET /api/v1/health', () => {
  it('should report the API and database as available', async () => {
    const res = await axios.get('/api/v1/health');

    expect(res.status).toBe(200);
    expect(res.data).toEqual({
      status: 'ok',
      services: {
        api: 'up',
        database: 'up',
      },
      timestamp: expect.any(String),
    });
  });

  it('exposes separate liveness and readiness probes', async () => {
    const [live, ready] = await Promise.all([
      axios.get('/api/v1/health/live'),
      axios.get('/api/v1/health/ready'),
    ]);

    expect(live.data).toEqual({
      status: 'ok',
      services: { api: 'up' },
      timestamp: expect.any(String),
    });
    expect(ready.data.services).toEqual({ api: 'up', database: 'up' });
  });

  it('returns request correlation and baseline security headers', async () => {
    const response = await axios.get('/api/v1/health/live', {
      headers: { 'x-request-id': 'client-request-123' },
    });

    expect(response.headers['x-request-id']).toBe('client-request-123');
    expect(response.headers['x-powered-by']).toBeUndefined();
    expect(response.headers['x-content-type-options']).toBe('nosniff');
  });

  it('returns the standard error contract without framework internals', async () => {
    const response = await axios.get('/api/v1/not-found', {
      validateStatus: () => true,
    });

    expect(response.status).toBe(404);
    expect(response.data).toEqual({
      statusCode: 404,
      code: 'NOT_FOUND',
      message: 'Cannot GET /api/v1/not-found',
      path: '/api/v1/not-found',
      requestId: expect.any(String),
      timestamp: expect.any(String),
    });
  });
});

describe('Auth and user management lifecycle', () => {
  it('protects cookie-authenticated endpoints with a custom CSRF header', async () => {
    const response = await axios.post(
      '/api/v1/auth/login',
      { email: TEST_ADMIN_EMAIL, password: TEST_ADMIN_PASSWORD },
      { validateStatus: () => true },
    );

    expect(response.status).toBe(403);
    expect(response.data.code).toBe('CSRF_PROTECTION_REQUIRED');
  });

  it('uses one generic error for invalid credentials', async () => {
    const response = await axios.post(
      '/api/v1/auth/login',
      { email: TEST_ADMIN_EMAIL, password: 'definitely-not-valid' },
      { headers: CSRF_HEADERS, validateStatus: () => true },
    );

    expect(response.status).toBe(401);
    expect(response.data).toMatchObject({
      code: 'INVALID_CREDENTIALS',
      message: 'Invalid email or password',
    });
  });

  it('logs in, authorizes users APIs, rotates refresh tokens, and logs out', async () => {
    const login = await axios.post(
      '/api/v1/auth/login',
      {
        email: `  ${TEST_ADMIN_EMAIL.toUpperCase()}  `,
        password: TEST_ADMIN_PASSWORD,
      },
      { headers: CSRF_HEADERS },
    );

    expect(login.status).toBe(200);
    expect(login.data).toMatchObject({
      accessToken: expect.any(String),
      expiresInSeconds: 900,
      user: {
        email: TEST_ADMIN_EMAIL,
        displayName: 'E2E Administrator',
        roleCodes: ['admin'],
        permissions: expect.arrayContaining(['users.read', 'users.manage']),
      },
    });
    expect(login.data.user.passwordHash).toBeUndefined();

    const firstSetCookie = readRefreshCookie(login);
    expect(firstSetCookie).toContain('HttpOnly');
    expect(firstSetCookie).toContain('SameSite=Strict');
    expect(firstSetCookie).toContain('Path=/api/v1/auth');
    const firstCookie = cookieHeader(firstSetCookie);
    const authorization = {
      Authorization: `Bearer ${login.data.accessToken as string}`,
    };

    const [me, listed] = await Promise.all([
      axios.get('/api/v1/auth/me', { headers: authorization }),
      axios.get('/api/v1/users?page=1&limit=20', { headers: authorization }),
    ]);
    expect(me.data.email).toBe(TEST_ADMIN_EMAIL);
    expect(listed.data).toMatchObject({
      data: expect.arrayContaining([
        expect.objectContaining({ email: TEST_ADMIN_EMAIL }),
      ]),
      meta: {
        page: 1,
        limit: 20,
        totalItems: 2,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    });

    const created = await axios.post(
      '/api/v1/users',
      {
        email: '  Created.User.E2E@Example.Test ',
        displayName: 'E2E Member',
        password: 'Member-only-password-123!',
        roleCodes: ['member'],
      },
      { headers: authorization },
    );
    expect(created.status).toBe(201);
    expect(created.data).toMatchObject({
      email: 'created.user.e2e@example.test',
      displayName: 'E2E Member',
      status: 'active',
      roleCodes: ['member'],
    });
    expect(created.data.passwordHash).toBeUndefined();

    const refreshed = await axios.post('/api/v1/auth/refresh', undefined, {
      headers: { ...CSRF_HEADERS, Cookie: firstCookie },
    });
    expect(refreshed.data.accessToken).toEqual(expect.any(String));
    const secondSetCookie = readRefreshCookie(refreshed);
    const secondCookie = cookieHeader(secondSetCookie);
    expect(secondCookie).not.toBe(firstCookie);

    const replay = await axios.post('/api/v1/auth/refresh', undefined, {
      headers: { ...CSRF_HEADERS, Cookie: firstCookie },
      validateStatus: () => true,
    });
    expect(replay.status).toBe(401);
    expect(replay.data.code).toBe('INVALID_REFRESH_SESSION');

    const logout = await axios.post('/api/v1/auth/logout', undefined, {
      headers: { ...CSRF_HEADERS, Cookie: secondCookie },
    });
    expect(logout.status).toBe(204);

    const afterLogout = await axios.post('/api/v1/auth/refresh', undefined, {
      headers: { ...CSRF_HEADERS, Cookie: secondCookie },
      validateStatus: () => true,
    });
    expect(afterLogout.status).toBe(401);
  });
});

describe('Projects and memberships lifecycle', () => {
  it('enforces project scope, membership roles, and the final-owner invariant', async () => {
    const [adminLogin, memberLogin] = await Promise.all([
      axios.post(
        '/api/v1/auth/login',
        { email: TEST_ADMIN_EMAIL, password: TEST_ADMIN_PASSWORD },
        { headers: CSRF_HEADERS },
      ),
      axios.post(
        '/api/v1/auth/login',
        { email: TEST_MEMBER_EMAIL, password: TEST_MEMBER_PASSWORD },
        { headers: CSRF_HEADERS },
      ),
    ]);
    const adminAuthorization = {
      Authorization: `Bearer ${adminLogin.data.accessToken as string}`,
    };
    const memberAuthorization = {
      Authorization: `Bearer ${memberLogin.data.accessToken as string}`,
    };
    lifecycleAdminAuthorization = adminAuthorization;
    lifecycleMemberAuthorization = memberAuthorization;
    lifecycleMemberId = memberLogin.data.user.id as string;

    const created = await axios.post(
      '/api/v1/projects',
      {
        code: '  pms-e2e ',
        name: '  E2E Project  ',
        description: '  Project membership contract  ',
        investor: '  IDS Corporation  ',
        province: '  Hồ Chí Minh  ',
        projectType: 'Chung cư kết hợp thương mại',
        operationalStatus: 'operational',
        unitCount: 420,
        floorAreaM2: 62500,
        revenueTotal: 5100000000,
        capex: 4200000000,
        dataSources: ['Teldata', 'DoanhThu'],
        dataConflict: true,
        startDate: '2026-08-10',
        dueDate: '2026-09-10',
      },
      { headers: adminAuthorization },
    );
    expect(created.status).toBe(201);
    expect(created.data).toMatchObject({
      code: 'PMS-E2E',
      name: 'E2E Project',
      description: 'Project membership contract',
      status: 'planning',
      operationalStatus: 'operational',
      investor: 'IDS Corporation',
      province: 'Hồ Chí Minh',
      unitCount: 420,
      floorAreaM2: 62500,
      revenueTotal: 5100000000,
      capex: 4200000000,
      dataSources: ['Teldata', 'DoanhThu'],
      dataConflict: true,
      memberCount: 1,
      myRole: 'owner',
      createdBy: adminLogin.data.user.id,
    });
    const projectId = created.data.id as string;

    const filtered = await axios.get(
      '/api/v1/projects?operationalStatus=operational&dataQuality=has_revenue&search=IDS%20Corporation',
      { headers: adminAuthorization },
    );
    expect(filtered.data).toMatchObject({
      data: [expect.objectContaining({ id: projectId })],
      meta: expect.objectContaining({ totalItems: 1 }),
    });

    const duplicate = await axios.post(
      '/api/v1/projects',
      { code: 'PMS-E2E', name: 'Duplicate' },
      { headers: adminAuthorization, validateStatus: () => true },
    );
    expect(duplicate.status).toBe(409);
    expect(duplicate.data.code).toBe('PROJECT_CODE_EXISTS');

    const beforeMembership = await axios.get('/api/v1/projects', {
      headers: memberAuthorization,
    });
    expect(beforeMembership.data.meta.totalItems).toBe(0);

    const candidates = await axios.get(
      `/api/v1/projects/${projectId}/member-candidates?search=member&limit=10`,
      { headers: adminAuthorization },
    );
    expect(candidates.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          userId: memberLogin.data.user.id,
          email: TEST_MEMBER_EMAIL,
        }),
      ]),
    );

    const addedMember = await axios.post(
      `/api/v1/projects/${projectId}/members`,
      { userId: memberLogin.data.user.id, role: 'member' },
      { headers: adminAuthorization },
    );
    expect(addedMember.status).toBe(200);
    expect(addedMember.data).toMatchObject({
      userId: memberLogin.data.user.id,
      email: TEST_MEMBER_EMAIL,
      role: 'member',
      status: 'active',
    });

    const memberProjects = await axios.get('/api/v1/projects', {
      headers: memberAuthorization,
    });
    expect(memberProjects.data).toMatchObject({
      data: [
        expect.objectContaining({
          id: projectId,
          memberCount: 2,
          myRole: 'member',
        }),
      ],
      meta: expect.objectContaining({ totalItems: 1 }),
    });

    const forbiddenDirectory = await axios.get(
      `/api/v1/projects/${projectId}/member-candidates`,
      { headers: memberAuthorization, validateStatus: () => true },
    );
    expect(forbiddenDirectory.status).toBe(403);
    expect(forbiddenDirectory.data.code).toBe('PROJECT_MANAGEMENT_FORBIDDEN');

    const forbiddenUpdate = await axios.patch(
      `/api/v1/projects/${projectId}`,
      { name: 'Member cannot update' },
      { headers: memberAuthorization, validateStatus: () => true },
    );
    expect(forbiddenUpdate.status).toBe(403);
    expect(forbiddenUpdate.data.code).toBe('PROJECT_MANAGEMENT_FORBIDDEN');

    const updated = await axios.patch(
      `/api/v1/projects/${projectId}`,
      { name: 'E2E Project Updated', status: 'active' },
      { headers: adminAuthorization },
    );
    expect(updated.data).toMatchObject({
      id: projectId,
      name: 'E2E Project Updated',
      status: 'active',
      memberCount: 2,
      myRole: 'owner',
    });

    const members = await axios.get(`/api/v1/projects/${projectId}/members`, {
      headers: adminAuthorization,
    });
    expect(members.data).toEqual([
      expect.objectContaining({
        userId: adminLogin.data.user.id,
        role: 'owner',
      }),
      expect.objectContaining({
        userId: memberLogin.data.user.id,
        role: 'member',
      }),
    ]);

    const lastOwnerRemoval = await axios.delete(
      `/api/v1/projects/${projectId}/members/${adminLogin.data.user.id as string}`,
      { headers: adminAuthorization, validateStatus: () => true },
    );
    expect(lastOwnerRemoval.status).toBe(409);
    expect(lastOwnerRemoval.data.code).toBe('PROJECT_LAST_OWNER_REQUIRED');
  });
});

describe('Project task plan lifecycle', () => {
  it('initializes five steps, scopes reads, and requires actual completion dates', async () => {
    const adminAuthorization = lifecycleAdminAuthorization;
    const memberAuthorization = lifecycleMemberAuthorization;

    const project = await axios.post(
      '/api/v1/projects',
      { code: 'TASK-E2E', name: 'Task Plan E2E' },
      { headers: adminAuthorization },
    );
    const projectId = project.data.id as string;

    const emptyProjectReport = await axios.get(
      `/api/v1/revenue?fiscalYear=2025&projectId=${projectId}`,
      { headers: lifecycleAdminAuthorization },
    );
    expect(emptyProjectReport.data).toMatchObject({
      data: [
        {
          projectId,
          revenueTotal: 0,
          costTotal: 0,
          quarters: [
            { quarter: 1, revenue: 0 },
            { quarter: 2, revenue: 0 },
            { quarter: 3, revenue: 0 },
            { quarter: 4, revenue: 0 },
          ],
        },
      ],
      overview: expect.objectContaining({
        totalProjects: 1,
        projectsWithRevenue: 0,
      }),
    });

    const initialized = await axios.post(
      `/api/v1/projects/${projectId}/tasks/initialize`,
      {},
      { headers: adminAuthorization },
    );
    expect(initialized.status).toBe(200);
    expect(initialized.data).toHaveLength(5);
    expect(initialized.data).toEqual([
      expect.objectContaining({
        step: 1,
        department: 'P.KTDA',
        status: 'todo',
      }),
      expect.objectContaining({
        step: 2,
        department: 'P.KTDA',
        status: 'todo',
      }),
      expect.objectContaining({
        step: 3,
        department: 'P.KTDA',
        status: 'todo',
      }),
      expect.objectContaining({
        step: 4,
        department: 'P.KDHT',
        status: 'todo',
      }),
      expect.objectContaining({
        step: 5,
        department: 'P.KTDA',
        status: 'todo',
      }),
    ]);

    const initializedAgain = await axios.post(
      `/api/v1/projects/${projectId}/tasks/initialize`,
      {},
      { headers: adminAuthorization },
    );
    expect(initializedAgain.data).toHaveLength(5);

    const beforeMembership = await axios.get('/api/v1/tasks', {
      headers: memberAuthorization,
    });
    expect(beforeMembership.data.meta.totalItems).toBe(0);

    await axios.post(
      `/api/v1/projects/${projectId}/members`,
      { userId: lifecycleMemberId, role: 'member' },
      { headers: adminAuthorization },
    );
    const memberTasks = await axios.get(
      `/api/v1/tasks?projectId=${projectId}&page=1&limit=50`,
      { headers: memberAuthorization },
    );
    expect(memberTasks.data).toMatchObject({
      meta: expect.objectContaining({ totalItems: 5 }),
      overview: {
        totalTasks: 5,
        completedTasks: 0,
        tasksWithActualEnd: 0,
        trackedProjects: 1,
      },
    });

    const memberInitialize = await axios.post(
      `/api/v1/projects/${projectId}/tasks/initialize`,
      {},
      { headers: memberAuthorization, validateStatus: () => true },
    );
    expect(memberInitialize.status).toBe(403);
    expect(memberInitialize.data.code).toBe('INSUFFICIENT_PERMISSION');

    const firstTaskId = initialized.data[0].id as string;
    const invalidCompletion = await axios.patch(
      `/api/v1/tasks/${firstTaskId}`,
      { status: 'done' },
      { headers: adminAuthorization, validateStatus: () => true },
    );
    expect(invalidCompletion.status).toBe(400);
    expect(invalidCompletion.data.code).toBe('TASK_ACTUAL_END_REQUIRED');

    const completed = await axios.patch(
      `/api/v1/tasks/${firstTaskId}`,
      {
        plannedStartDate: '2026-08-10',
        plannedEndDate: '2026-08-20',
        actualEndDate: '2026-08-19',
        status: 'done',
      },
      { headers: adminAuthorization },
    );
    expect(completed.data).toMatchObject({
      id: firstTaskId,
      status: 'done',
      actualEndDate: expect.any(String),
    });

    const completedTasks = await axios.get(
      `/api/v1/tasks?projectId=${projectId}&status=done`,
      { headers: adminAuthorization },
    );
    expect(completedTasks.data).toMatchObject({
      data: [expect.objectContaining({ id: firstTaskId, status: 'done' })],
      meta: expect.objectContaining({ totalItems: 1 }),
      overview: expect.objectContaining({
        completedTasks: 1,
        tasksWithActualEnd: 1,
      }),
    });
  });
});

describe('Data quality report lifecycle', () => {
  it('summarizes accessible project and task issues without leaking project scope', async () => {
    const adminAuthorization = lifecycleAdminAuthorization;
    const memberAuthorization = lifecycleMemberAuthorization;
    const project = await axios.post(
      '/api/v1/projects',
      {
        code: 'DQ-E2E',
        name: 'Data Quality E2E',
        investor: 'IDS Quality Investor',
        dataConflict: true,
      },
      { headers: adminAuthorization },
    );
    const projectId = project.data.id as string;
    const initialized = await axios.post(
      `/api/v1/projects/${projectId}/tasks/initialize`,
      {},
      { headers: adminAuthorization },
    );
    await axios.patch(
      `/api/v1/tasks/${initialized.data[0].id as string}`,
      {
        plannedStartDate: '2020-01-01',
        plannedEndDate: '2020-01-02',
        status: 'in_progress',
      },
      { headers: adminAuthorization },
    );

    const outsideMemberScope = await axios.get(
      '/api/v1/data-quality?search=DQ-E2E',
      { headers: memberAuthorization },
    );
    expect(outsideMemberScope.data.meta.totalItems).toBe(0);

    await axios.post(
      `/api/v1/projects/${projectId}/members`,
      { userId: lifecycleMemberId, role: 'member' },
      { headers: adminAuthorization },
    );
    const report = await axios.get(
      '/api/v1/data-quality?page=1&limit=20&issueType=overdue_task&search=IDS%20Quality',
      { headers: memberAuthorization },
    );
    expect(report.data).toMatchObject({
      data: [
        {
          projectId,
          projectCode: 'DQ-E2E',
          projectName: 'Data Quality E2E',
          issueTypes: expect.arrayContaining([
            'data_conflict',
            'missing_capex',
            'missing_task_plan',
            'overdue_task',
          ]),
          issueCount: 7,
          missingTaskPlanCount: 4,
          overdueTaskCount: 1,
          missingActualEndCount: 0,
        },
      ],
      meta: expect.objectContaining({ totalItems: 1 }),
      summary: expect.objectContaining({
        totalProjects: expect.any(Number),
        affectedProjects: expect.any(Number),
        totalIssues: expect.any(Number),
        overdueTasks: expect.any(Number),
      }),
    });

    const invalidFilter = await axios.get(
      '/api/v1/data-quality?issueType=unknown',
      { headers: adminAuthorization, validateStatus: () => true },
    );
    expect(invalidFilter.status).toBe(400);
    expect(invalidFilter.data.code).toBe('VALIDATION_ERROR');
  });
});

describe('Carrier contract lifecycle', () => {
  it('creates, scopes, filters and completes contract terms', async () => {
    const project = await axios.post(
      '/api/v1/projects',
      { code: 'CC-E2E', name: 'Carrier Contract E2E', unitCount: 200 },
      { headers: lifecycleAdminAuthorization },
    );
    const projectId = project.data.id as string;
    const created = await axios.post(
      '/api/v1/carrier-contracts',
      { projectId, carrier: 'Viettel', serviceType: 'teldata', quantity: 120 },
      { headers: lifecycleAdminAuthorization },
    );
    expect(created.data).toMatchObject({
      projectId,
      unit: 'apartment',
      termsComplete: false,
      penetrationRate: 0.6,
    });

    const outsideScope = await axios.get('/api/v1/carrier-contracts', {
      headers: lifecycleMemberAuthorization,
    });
    expect(outsideScope.data.meta.totalItems).toBe(0);

    await axios.post(
      `/api/v1/projects/${projectId}/members`,
      { userId: lifecycleMemberId, role: 'member' },
      { headers: lifecycleAdminAuthorization },
    );
    const memberList = await axios.get(
      `/api/v1/carrier-contracts?projectId=${projectId}&carrier=Viettel&serviceType=teldata`,
      { headers: lifecycleMemberAuthorization },
    );
    expect(memberList.data).toMatchObject({
      meta: expect.objectContaining({ totalItems: 1 }),
      overview: expect.objectContaining({
        totalContracts: 1,
        teldataContracts: 1,
      }),
      availableCarriers: ['Viettel'],
    });

    const memberWrite = await axios.patch(
      `/api/v1/carrier-contracts/${created.data.id as string}`,
      { unitPrice: 50_000 },
      { headers: lifecycleMemberAuthorization, validateStatus: () => true },
    );
    expect(memberWrite.status).toBe(403);

    const completed = await axios.patch(
      `/api/v1/carrier-contracts/${created.data.id as string}`,
      {
        unitPrice: 50_000,
        paymentCycle: 'monthly',
        startDate: '2026-01-01',
        endDate: '2026-12-31',
      },
      { headers: lifecycleAdminAuthorization },
    );
    expect(completed.data.termsComplete).toBe(true);
  });
});

describe('Revenue actual lifecycle', () => {
  it('upserts, scopes and aggregates project quarters for a fiscal year', async () => {
    const project = await axios.post(
      '/api/v1/projects',
      { code: 'REV-E2E', name: 'Revenue E2E' },
      { headers: lifecycleAdminAuthorization },
    );
    const projectId = project.data.id as string;

    const outsideScope = await axios.get('/api/v1/revenue?fiscalYear=2025', {
      headers: lifecycleMemberAuthorization,
    });
    expect(outsideScope.data.meta.totalItems).toBe(0);
    expect(outsideScope.data.data).toEqual([]);

    const outsideProjectScope = await axios.get(
      `/api/v1/revenue?fiscalYear=2025&projectId=${projectId}`,
      { headers: lifecycleMemberAuthorization },
    );
    expect(outsideProjectScope.data.data).toEqual([]);

    await axios.put(
      '/api/v1/revenue',
      {
        projectId,
        fiscalYear: 2025,
        quarter: 1,
        revenue: 120_000_000,
        cost: 80_000_000,
      },
      { headers: lifecycleAdminAuthorization },
    );
    await axios.put(
      '/api/v1/revenue',
      {
        projectId,
        fiscalYear: 2025,
        quarter: 4,
        revenue: 300_000_000,
        cost: 120_000_000,
      },
      { headers: lifecycleAdminAuthorization },
    );

    await axios.post(
      `/api/v1/projects/${projectId}/members`,
      { userId: lifecycleMemberId, role: 'member' },
      { headers: lifecycleAdminAuthorization },
    );
    const report = await axios.get(
      '/api/v1/revenue?fiscalYear=2025&search=Revenue',
      { headers: lifecycleMemberAuthorization },
    );
    expect(report.data).toMatchObject({
      fiscalYear: 2025,
      data: [
        {
          projectId,
          revenueTotal: 420_000_000,
          costTotal: 200_000_000,
          grossProfit: 220_000_000,
          quarters: [
            { quarter: 1, revenue: 120_000_000 },
            { quarter: 2, revenue: 0 },
            { quarter: 3, revenue: 0 },
            { quarter: 4, revenue: 300_000_000 },
          ],
        },
      ],
      overview: expect.objectContaining({
        projectsWithRevenue: 1,
        totalRevenue: 420_000_000,
      }),
      quarters: expect.arrayContaining([
        expect.objectContaining({ quarter: 4, revenue: 300_000_000 }),
      ]),
    });

    const memberWrite = await axios.put(
      '/api/v1/revenue',
      {
        projectId,
        fiscalYear: 2025,
        quarter: 2,
        revenue: 1,
        cost: 0,
      },
      { headers: lifecycleMemberAuthorization, validateStatus: () => true },
    );
    expect(memberWrite.status).toBe(403);

    const invalid = await axios.put(
      '/api/v1/revenue',
      {
        projectId,
        fiscalYear: 2025,
        quarter: 5,
        revenue: -1,
        cost: 0,
      },
      { headers: lifecycleAdminAuthorization, validateStatus: () => true },
    );
    expect(invalid.status).toBe(400);
    expect(invalid.data.code).toBe('VALIDATION_ERROR');

    const invalidProjectFilter = await axios.get(
      '/api/v1/revenue?fiscalYear=2025&projectId=not-an-object-id',
      { headers: lifecycleAdminAuthorization, validateStatus: () => true },
    );
    expect(invalidProjectFilter.status).toBe(400);
    expect(invalidProjectFilter.data.code).toBe('VALIDATION_ERROR');
  });
});

describe('Dashboard snapshot', () => {
  it('returns one scoped portfolio aggregation and validates the fiscal year', async () => {
    const snapshot = await axios.get('/api/v1/dashboard?fiscalYear=2025', {
      headers: lifecycleMemberAuthorization,
    });

    expect(snapshot.data).toMatchObject({
      fiscalYear: 2025,
      overview: expect.objectContaining({
        totalProjects: expect.any(Number),
        totalRevenue: 420_000_000,
        totalCost: 200_000_000,
        grossProfit: 220_000_000,
        projectsWithRevenue: 1,
        totalCarrierContracts: 1,
        teldataContracts: 1,
      }),
      quarters: [
        expect.objectContaining({ quarter: 1, revenue: 120_000_000 }),
        expect.objectContaining({ quarter: 2, revenue: 0 }),
        expect.objectContaining({ quarter: 3, revenue: 0 }),
        expect.objectContaining({ quarter: 4, revenue: 300_000_000 }),
      ],
      operationalStatuses: expect.arrayContaining([
        expect.objectContaining({ status: 'not_started' }),
        expect.objectContaining({ status: 'operational' }),
      ]),
      topRevenueProjects: [
        expect.objectContaining({
          projectCode: 'REV-E2E',
          revenue: 420_000_000,
        }),
      ],
      carrierContractsByCarrier: [
        expect.objectContaining({ carrier: 'Viettel', contracts: 1 }),
      ],
    });

    const invalid = await axios.get('/api/v1/dashboard?fiscalYear=1999', {
      headers: lifecycleAdminAuthorization,
      validateStatus: () => true,
    });
    expect(invalid.status).toBe(400);
    expect(invalid.data.code).toBe('VALIDATION_ERROR');
  });
});

describe('Payback report', () => {
  it('evaluates cumulative revenue through the selected fiscal year within project scope', async () => {
    const project = await axios.post(
      '/api/v1/projects',
      {
        code: 'PAY-E2E',
        name: 'Payback E2E',
        capex: 300_000_000,
      },
      { headers: lifecycleAdminAuthorization },
    );
    const projectId = project.data.id as string;
    await axios.put(
      '/api/v1/revenue',
      {
        projectId,
        fiscalYear: 2024,
        quarter: 4,
        revenue: 100_000_000,
        cost: 40_000_000,
      },
      { headers: lifecycleAdminAuthorization },
    );
    await axios.put(
      '/api/v1/revenue',
      {
        projectId,
        fiscalYear: 2025,
        quarter: 1,
        revenue: 250_000_000,
        cost: 100_000_000,
      },
      { headers: lifecycleAdminAuthorization },
    );
    await axios.post(
      `/api/v1/projects/${projectId}/members`,
      { userId: lifecycleMemberId, role: 'member' },
      { headers: lifecycleAdminAuthorization },
    );

    const through2025 = await axios.get(
      '/api/v1/payback?fiscalYear=2025&search=Payback',
      { headers: lifecycleMemberAuthorization },
    );
    expect(through2025.data).toMatchObject({
      fiscalYear: 2025,
      data: [
        {
          projectId,
          capex: 300_000_000,
          cumulativeRevenue: 350_000_000,
          recoveryRatio: 350_000_000 / 300_000_000,
          status: 'paid_back',
        },
      ],
      meta: expect.objectContaining({ totalItems: 1 }),
      overview: expect.objectContaining({
        totalProjects: expect.any(Number),
        evaluableProjects: expect.any(Number),
      }),
    });

    const through2024 = await axios.get(
      '/api/v1/payback?fiscalYear=2024&status=not_paid_back&search=PAY-E2E',
      { headers: lifecycleMemberAuthorization },
    );
    expect(through2024.data.data).toEqual([
      expect.objectContaining({
        cumulativeRevenue: 100_000_000,
        recoveryRatio: 1 / 3,
        status: 'not_paid_back',
      }),
    ]);

    const invalid = await axios.get(
      '/api/v1/payback?fiscalYear=2025&status=unknown',
      { headers: lifecycleAdminAuthorization, validateStatus: () => true },
    );
    expect(invalid.status).toBe(400);
    expect(invalid.data.code).toBe('VALIDATION_ERROR');
  });
});

describe('Business opportunity lifecycle', () => {
  it('creates, filters and updates a global opportunity pipeline', async () => {
    const created = await axios.post(
      '/api/v1/opportunities',
      {
        name: '  Opportunity E2E  ',
        region: 'south',
        province: '  Hồ Chí Minh  ',
        investor: '  IDS Opportunity Investor  ',
        ownerName: '  Chị Lan  ',
        stage: 2,
        unitCount: 420,
        feasible: true,
        lastInteractionDate: '2026-08-10',
      },
      { headers: lifecycleAdminAuthorization },
    );
    expect(created.status).toBe(201);
    expect(created.data).toMatchObject({
      name: 'Opportunity E2E',
      province: 'Hồ Chí Minh',
      investor: 'IDS Opportunity Investor',
      ownerName: 'Chị Lan',
      stage: 2,
      feasible: true,
    });

    const listed = await axios.get(
      '/api/v1/opportunities?search=Opportunity&stage=2&region=south&ownerName=Ch%E1%BB%8B%20Lan&feasible=true',
      { headers: lifecycleMemberAuthorization },
    );
    expect(listed.data).toMatchObject({
      data: [expect.objectContaining({ id: created.data.id, unitCount: 420 })],
      meta: expect.objectContaining({ totalItems: 1 }),
      overview: expect.objectContaining({
        totalOpportunities: 1,
        feasibleOpportunities: 1,
        missingOwner: 0,
        missingLastInteraction: 0,
      }),
      availableOwners: ['Chị Lan'],
    });
    expect(listed.data.overview.stages).toEqual([
      { stage: 1, total: 0 },
      { stage: 2, total: 1 },
      { stage: 3, total: 0 },
      { stage: 4, total: 0 },
    ]);

    const memberWrite = await axios.patch(
      `/api/v1/opportunities/${created.data.id as string}`,
      { stage: 3 },
      { headers: lifecycleMemberAuthorization, validateStatus: () => true },
    );
    expect(memberWrite.status).toBe(403);

    const updated = await axios.patch(
      `/api/v1/opportunities/${created.data.id as string}`,
      { stage: 4, ownerName: null, lastInteractionDate: null },
      { headers: lifecycleAdminAuthorization },
    );
    expect(updated.data).toMatchObject({ stage: 4, feasible: true });
    expect(updated.data.ownerName).toBeUndefined();
    expect(updated.data.lastInteractionDate).toBeUndefined();

    const invalid = await axios.post(
      '/api/v1/opportunities',
      { name: 'Invalid stage', region: 'south', stage: 5 },
      { headers: lifecycleAdminAuthorization, validateStatus: () => true },
    );
    expect(invalid.status).toBe(400);
    expect(invalid.data.code).toBe('VALIDATION_ERROR');
  });
});
