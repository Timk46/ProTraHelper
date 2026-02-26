/**
 * Creates a mock logger that mirrors the electron-log API.
 * All methods are jest.fn() for assertion support.
 * @returns {object} Mock logger instance
 */
function createMockLogger() {
  return {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    verbose: jest.fn(),
    silly: jest.fn(),
  };
}

module.exports = { createMockLogger };
