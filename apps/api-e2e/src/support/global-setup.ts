import axios from 'axios';
import { DEFAULT_TEST_DATABASE_URI, dropTestDatabase } from './test-database';

module.exports = async function () {
  console.log('\nSetting up...\n');

  const host = process.env.HOST ?? '127.0.0.1';
  const port = process.env.E2E_API_PORT
    ? Number(process.env.E2E_API_PORT)
    : 3100;
  await dropTestDatabase(
    process.env.MONGODB_TEST_URI ?? DEFAULT_TEST_DATABASE_URI,
  );

  const healthUrl = `http://${host}:${port}/api/v1/health/live`;
  for (let attempt = 1; attempt <= 50; attempt += 1) {
    try {
      await axios.get(healthUrl, { timeout: 250 });
      return;
    } catch {
      if (attempt === 50) {
        throw new Error(`API did not become ready at ${healthUrl}`);
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
};
