const ALLOWED_DATABASE_SUFFIXES = ['_uat', '_demo'];

export function readDatabaseName(mongoUri) {
  let parsed;
  try {
    parsed = new URL(mongoUri);
  } catch {
    throw new Error('MONGODB_URI must be a valid MongoDB connection URI');
  }
  if (parsed.protocol !== 'mongodb:' && parsed.protocol !== 'mongodb+srv:') {
    throw new Error('MONGODB_URI must use mongodb or mongodb+srv');
  }
  const databaseName = decodeURIComponent(parsed.pathname.replace(/^\//, ''));
  if (!databaseName)
    throw new Error('MONGODB_URI must include a database name');
  return databaseName;
}

export function assertDemoSeedSafety({ mongoUri, confirmation }) {
  const databaseName = readDatabaseName(mongoUri);
  if (
    !ALLOWED_DATABASE_SUFFIXES.some((suffix) => databaseName.endsWith(suffix))
  ) {
    throw new Error('Demo seed database name must end with _uat or _demo');
  }
  const expectedConfirmation = `seed:${databaseName}`;
  if (confirmation !== expectedConfirmation) {
    throw new Error(
      `DEMO_SEED_CONFIRM must equal ${expectedConfirmation} for this database`,
    );
  }
  return { databaseName };
}
