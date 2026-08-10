import mongoose from 'mongoose';
import * as argon2 from 'argon2';

export const TEST_ADMIN_EMAIL = 'admin.e2e@example.test';
export const TEST_ADMIN_PASSWORD = 'E2e-only-password-123!';

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
        ],
      },
      {
        code: 'member',
        name: 'Member',
        permissions: ['projects.read', 'tasks.read'],
      },
    ]);
    await connection.collection('users').insertOne({
      email: TEST_ADMIN_EMAIL,
      displayName: 'E2E Administrator',
      passwordHash: await argon2.hash(TEST_ADMIN_PASSWORD, {
        type: argon2.argon2id,
        memoryCost: 19_456,
        timeCost: 2,
        parallelism: 1,
      }),
      status: 'active',
      roleCodes: ['admin'],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  } finally {
    await connection.close();
  }
}
