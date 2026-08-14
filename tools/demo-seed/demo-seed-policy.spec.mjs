import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { assertDemoSeedSafety, readDatabaseName } from './demo-seed-policy.mjs';

describe('demo seed safety policy', () => {
  it('extracts the database name from standard and SRV MongoDB URIs', () => {
    assert.equal(
      readDatabaseName(
        'mongodb://localhost:27017/project_ql_uat?replicaSet=rs0',
      ),
      'project_ql_uat',
    );
    assert.equal(
      readDatabaseName('mongodb+srv://cluster.example/project_ql_demo'),
      'project_ql_demo',
    );
  });

  it('refuses development or production-looking database names', () => {
    assert.throws(
      () =>
        assertDemoSeedSafety({
          mongoUri: 'mongodb://localhost:27017/project_ql',
          confirmation: 'seed:project_ql',
        }),
      /must end with _uat or _demo/,
    );
  });

  it('requires an exact database-specific confirmation', () => {
    assert.throws(
      () =>
        assertDemoSeedSafety({
          mongoUri: 'mongodb://localhost:27017/project_ql_uat',
          confirmation: 'yes',
        }),
      /DEMO_SEED_CONFIRM must equal seed:project_ql_uat/,
    );
  });

  it('allows an explicitly confirmed UAT database', () => {
    assert.deepEqual(
      assertDemoSeedSafety({
        mongoUri: 'mongodb://localhost:27017/project_ql_uat',
        confirmation: 'seed:project_ql_uat',
      }),
      { databaseName: 'project_ql_uat' },
    );
  });
});
