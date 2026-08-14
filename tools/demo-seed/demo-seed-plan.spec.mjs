import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createDemoSeedPlan } from './demo-seed-plan.mjs';
import { seedDemo } from './demo-seed-runner.mjs';

describe('demo seed plan', () => {
  it('creates a coherent portfolio covering primary UAT states', () => {
    const actor = {
      id: '66a000000000000000000001',
      displayName: 'UAT Administrator',
      email: 'uat-admin@example.test',
    };
    const plan = createDemoSeedPlan(actor);
    const byCollection = new Map(
      plan.map((group) => [group.collection, group.documents]),
    );
    const projects = byCollection.get('projects');
    const tasks = byCollection.get('tasks');
    const contracts = byCollection.get('carrier_contracts');
    const receivables = byCollection.get('receivables');

    assert.equal(projects?.length, 3);
    assert.equal(tasks?.length, 15);
    assert.equal(contracts?.length, 4);
    assert.equal(receivables?.length, 4);
    assert.ok(projects?.some((item) => item.dataConflict === true));
    assert.ok(projects?.some((item) => item.capex === undefined));
    assert.ok(tasks?.some((item) => item.status === 'done'));
    assert.ok(tasks?.some((item) => item.status === 'in_progress'));
    assert.ok(receivables?.some((item) => item.amountPaid === item.amountDue));
    assert.ok(
      receivables?.some(
        (item) => item.amountPaid > 0 && item.amountPaid < item.amountDue,
      ),
    );
    assert.ok(
      receivables?.every((item) =>
        contracts?.some((contract) =>
          contract._id.equals(item.carrierContractId),
        ),
      ),
    );
  });

  it('is idempotent when executed repeatedly', async () => {
    const insertedKeys = new Set();
    const repository = {
      async upsertGroup(group) {
        let inserted = 0;
        for (const document of group.documents) {
          if (insertedKeys.has(document.demoSeedKey)) continue;
          insertedKeys.add(document.demoSeedKey);
          inserted += 1;
        }
        return { inserted, matched: group.documents.length - inserted };
      },
    };
    const plan = createDemoSeedPlan({
      id: '66a000000000000000000001',
      displayName: 'UAT Administrator',
      email: 'uat-admin@example.test',
    });

    const first = await seedDemo(repository, plan);
    const second = await seedDemo(repository, plan);

    assert.ok(first.inserted > 0);
    assert.equal(second.inserted, 0);
    assert.equal(second.matched, first.inserted);
    assert.equal(insertedKeys.size, first.inserted);
  });
});
