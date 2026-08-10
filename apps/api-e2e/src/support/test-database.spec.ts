import { requireTestDatabaseUri } from './test-database';

describe('requireTestDatabaseUri', () => {
  it('accepts an explicitly isolated test database', () => {
    expect(
      requireTestDatabaseUri('mongodb://localhost:27017/project_ql_test'),
    ).toBe('mongodb://localhost:27017/project_ql_test');
  });

  it('rejects a development database', () => {
    expect(() =>
      requireTestDatabaseUri('mongodb://localhost:27017/project_ql'),
    ).toThrow('must end with _test');
  });
});
