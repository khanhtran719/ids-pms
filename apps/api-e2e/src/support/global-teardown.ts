import { DEFAULT_TEST_DATABASE_URI, dropTestDatabase } from './test-database';

module.exports = async function () {
  await dropTestDatabase(
    process.env.MONGODB_TEST_URI ?? DEFAULT_TEST_DATABASE_URI,
  );
  console.log('\nTearing down...\n');
};
