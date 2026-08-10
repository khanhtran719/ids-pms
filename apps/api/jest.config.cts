module.exports = {
  displayName: 'api',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../coverage/apps/api',
  coverageReporters: ['text-summary', 'html', 'lcov', 'json-summary'],
  collectCoverageFrom: [
    '<rootDir>/src/**/*.ts',
    '!<rootDir>/src/**/*.spec.ts',
    '!<rootDir>/src/main.ts',
    '!<rootDir>/src/**/*.module.ts',
    '!<rootDir>/src/**/*.controller.ts',
    '!<rootDir>/src/**/*.dto.ts',
    '!<rootDir>/src/**/*.schemas.ts',
    '!<rootDir>/src/**/*-request.ts',
    '!<rootDir>/src/**/request-context.ts',
  ],
  coverageThreshold: {
    global: {
      statements: 91,
      branches: 73,
      functions: 93,
      lines: 92,
    },
  },
};
