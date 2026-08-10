import mongoose from 'mongoose';

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
