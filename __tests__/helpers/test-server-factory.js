const { createMockLogger } = require('./mock-logger');
const { createMockRhinoPathManager } = require('./mock-rhino-path-manager');

/**
 * Creates an AppServer instance with mocked dependencies for testing.
 * IMPORTANT: jest.mock() calls for rhino-launcher, file-downloader, and pairing-manager
 * must happen in the calling test file BEFORE requiring this factory.
 *
 * @param {object} [options] - Configuration options
 * @param {object} [options.logger] - Custom logger (default: createMockLogger())
 * @param {object} [options.rhinoPathManager] - Custom RhinoPathManager mock
 * @param {string} [options.tempDir] - Temp directory path (default: '/tmp/test')
 * @param {string[]} [options.allowedOrigins] - Allowed CORS origins
 * @param {string} [options.apiSecretToken] - API secret token (default: 'test-secret-token')
 * @returns {{ server: AppServer, logger: object, rhinoPathManager: object, apiSecretToken: string }}
 */
function createTestServer(options = {}) {
  const logger = options.logger || createMockLogger();
  const rhinoPathManager = options.rhinoPathManager || createMockRhinoPathManager();
  const tempDir = options.tempDir || '/tmp/test';
  const allowedOrigins = options.allowedOrigins || ['https://protra.hefl.de'];
  const apiSecretToken = options.apiSecretToken || 'test-secret-token';

  // Require AppServer after mocks are set up (caller must set up jest.mock() first)
  const AppServer = require('../../src/server/express-server');

  const server = new AppServer(logger, rhinoPathManager, tempDir, allowedOrigins, apiSecretToken);

  return {
    server,
    app: server.app,
    logger,
    rhinoPathManager,
    apiSecretToken,
  };
}

module.exports = { createTestServer };
