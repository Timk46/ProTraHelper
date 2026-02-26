module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/utils/logger.js',
    '!src/tray-manager/**',
  ],
  restoreMocks: true,
};
