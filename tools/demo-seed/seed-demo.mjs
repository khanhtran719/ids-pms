import mongoose from 'mongoose';
import { createDemoSeedPlan } from './demo-seed-plan.mjs';
import { assertDemoSeedSafety } from './demo-seed-policy.mjs';
import { MongoDemoSeedRepository } from './demo-seed-repository.mjs';
import { seedDemo } from './demo-seed-runner.mjs';

async function main() {
  const mongoUri = process.env.MONGODB_URI ?? '';
  const confirmation = process.env.DEMO_SEED_CONFIRM ?? '';
  const adminEmail = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const { databaseName } = assertDemoSeedSafety({ mongoUri, confirmation });
  if (!adminEmail) {
    throw new Error(
      'SEED_ADMIN_EMAIL is required to assign demo data ownership',
    );
  }

  const connection = await mongoose
    .createConnection(mongoUri, { serverSelectionTimeoutMS: 10_000 })
    .asPromise();
  try {
    const repository = new MongoDemoSeedRepository(connection);
    const actor = await repository.findSeedActor(adminEmail);
    if (!actor) {
      throw new Error(
        'Configured active administrator was not found; start the API once before seeding',
      );
    }
    const result = await seedDemo(repository, createDemoSeedPlan(actor));
    console.log(
      `Demo seed completed for ${databaseName}: ${result.inserted} inserted, ${result.matched} already present.`,
    );
    for (const item of result.collections) {
      console.log(
        `- ${item.collection}: ${item.inserted} inserted, ${item.matched} present`,
      );
    }
  } finally {
    await connection.close();
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : 'Unknown seed error';
  console.error(`Demo seed failed: ${message}`);
  process.exitCode = 1;
});
