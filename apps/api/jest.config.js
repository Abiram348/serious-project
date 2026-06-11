/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: '<rootDir>/tsconfig.json',
    }],
  },
  // e2b and chalk@5 are ESM-only; Jest needs to transform them
  transformIgnorePatterns: [
    'node_modules/(?!(e2b|chalk|#ansi-styles)/)',
  ],
  moduleNameMapper: {
    '^e2b$': '<rootDir>/src/__mocks__/e2b.ts',
  },
};
