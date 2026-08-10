import axios from 'axios';
import {
  TEST_ADMIN_EMAIL,
  TEST_ADMIN_PASSWORD,
  TEST_MEMBER_EMAIL,
  TEST_MEMBER_PASSWORD,
} from '../support/test-database';

const CSRF_HEADERS = { 'x-csrf-protection': '1' };

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

    const created = await axios.post(
      '/api/v1/projects',
      {
        code: '  pms-e2e ',
        name: '  E2E Project  ',
        description: '  Project membership contract  ',
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
      memberCount: 1,
      myRole: 'owner',
      createdBy: adminLogin.data.user.id,
    });
    const projectId = created.data.id as string;

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
