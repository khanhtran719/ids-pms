import mongoose from 'mongoose';
import * as argon2 from 'argon2';

export const TEST_ADMIN_EMAIL = 'admin.e2e@example.test';
export const TEST_ADMIN_PASSWORD = 'E2e-only-password-123!';
export const TEST_MEMBER_EMAIL = 'member.e2e@example.test';
export const TEST_MEMBER_PASSWORD = 'Member-e2e-password-123!';

export const DEFAULT_TEST_DATABASE_URI =
  'mongodb://localhost:27017/project_ql_test?replicaSet=rs0&directConnection=true';

export function requireTestDatabaseUri(uri: string): string {
  const databaseName = new URL(uri).pathname.slice(1);

  if (!databaseName.endsWith('_test')) {
    throw new Error('E2E MongoDB database name must end with _test');
  }

  return uri;
}

export async function dropTestDatabase(uri: string): Promise<void> {
  const testUri = requireTestDatabaseUri(uri);
  const connection = await mongoose
    .createConnection(testUri, { serverSelectionTimeoutMS: 3_000 })
    .asPromise();

  try {
    await connection.dropDatabase();
  } finally {
    await connection.close();
  }
}

export async function seedTestAuthData(uri: string): Promise<void> {
  const testUri = requireTestDatabaseUri(uri);
  const connection = await mongoose
    .createConnection(testUri, { serverSelectionTimeoutMS: 3_000 })
    .asPromise();

  try {
    await connection.collection('roles').insertMany([
      {
        code: 'admin',
        name: 'Administrator',
        permissions: [
          'users.read',
          'users.manage',
          'projects.read',
          'projects.manage',
          'tasks.read',
          'tasks.manage',
          'carrier-contracts.read',
          'carrier-contracts.manage',
          'revenue.read',
          'revenue.manage',
        ],
      },
      {
        code: 'manager',
        name: 'Manager',
        permissions: [
          'users.read',
          'projects.read',
          'projects.manage',
          'tasks.read',
          'tasks.manage',
          'carrier-contracts.read',
          'carrier-contracts.manage',
          'revenue.read',
          'revenue.manage',
        ],
      },
      {
        code: 'member',
        name: 'Member',
        permissions: [
          'projects.read',
          'tasks.read',
          'carrier-contracts.read',
          'revenue.read',
        ],
      },
    ]);
    const hashOptions = {
      type: argon2.argon2id,
      memoryCost: 19_456,
      timeCost: 2,
      parallelism: 1,
    } as const;
    const [adminPasswordHash, memberPasswordHash] = await Promise.all([
      argon2.hash(TEST_ADMIN_PASSWORD, hashOptions),
      argon2.hash(TEST_MEMBER_PASSWORD, hashOptions),
    ]);
    await connection.collection('users').insertMany([
      {
        email: TEST_ADMIN_EMAIL,
        displayName: 'E2E Administrator',
        passwordHash: adminPasswordHash,
        status: 'active',
        roleCodes: ['admin'],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        email: TEST_MEMBER_EMAIL,
        displayName: 'E2E Member',
        passwordHash: memberPasswordHash,
        status: 'active',
        roleCodes: ['member'],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  } finally {
    await connection.close();
  }
}
