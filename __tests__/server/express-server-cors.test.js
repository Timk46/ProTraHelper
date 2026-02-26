// Mock dependencies BEFORE requiring the module under test
jest.mock('../../src/rhino-automator/rhino-launcher', () => {
  return jest.fn().mockImplementation(() => ({
    initialize: jest.fn().mockResolvedValue(undefined),
    launchRhinoWithGrasshopper: jest.fn().mockResolvedValue({ success: true }),
  }));
});

jest.mock('../../src/server/file-downloader', () => {
  return jest.fn().mockImplementation(() => ({
    cleanupOldFiles: jest.fn().mockResolvedValue(undefined),
    downloadFile: jest.fn().mockResolvedValue({ success: true }),
  }));
});

jest.mock('../../src/server/pairing-manager', () => {
  return jest.fn().mockImplementation(() => ({
    pair: jest.fn().mockResolvedValue({ success: true }),
    unpair: jest.fn(),
    validateSessionToken: jest.fn().mockReturnValue(true),
    getPairingStatus: jest.fn().mockReturnValue({ isPaired: false }),
  }));
});

const request = require('supertest');
const { createTestServer } = require('../helpers/test-server-factory');

describe('Express Server - CORS', () => {
  describe('Development mode (default)', () => {
    let app;

    beforeEach(() => {
      // Ensure we're NOT in production
      delete process.env.NODE_ENV;
      // Clear require cache to get fresh AppServer instance with current NODE_ENV
      jest.resetModules();
      // Re-setup mocks after resetModules
      jest.mock('../../src/rhino-automator/rhino-launcher', () => {
        return jest.fn().mockImplementation(() => ({
          initialize: jest.fn().mockResolvedValue(undefined),
          launchRhinoWithGrasshopper: jest.fn().mockResolvedValue({ success: true }),
        }));
      });
      jest.mock('../../src/server/file-downloader', () => {
        return jest.fn().mockImplementation(() => ({
          cleanupOldFiles: jest.fn().mockResolvedValue(undefined),
          downloadFile: jest.fn().mockResolvedValue({ success: true }),
        }));
      });
      jest.mock('../../src/server/pairing-manager', () => {
        return jest.fn().mockImplementation(() => ({
          pair: jest.fn().mockResolvedValue({ success: true }),
          unpair: jest.fn(),
          validateSessionToken: jest.fn().mockReturnValue(true),
          getPairingStatus: jest.fn().mockReturnValue({ isPaired: false }),
        }));
      });

      const { createTestServer: freshFactory } = require('../helpers/test-server-factory');
      const ctx = freshFactory();
      app = ctx.app;
    });

    test('allows any origin in dev mode', async () => {
      const res = await request(app)
        .get('/status')
        .set('Origin', 'http://localhost:4200');

      expect(res.status).toBe(200);
      expect(res.headers['access-control-allow-origin']).toBeDefined();
    });

    test('allows unknown origin in dev mode', async () => {
      const res = await request(app)
        .get('/status')
        .set('Origin', 'https://evil.example.com');

      expect(res.status).toBe(200);
    });
  });

  describe('Production mode', () => {
    let app;
    const allowedOrigin = 'https://protra.hefl.de';

    beforeEach(() => {
      process.env.NODE_ENV = 'production';
      jest.resetModules();
      // Re-setup mocks after resetModules
      jest.mock('../../src/rhino-automator/rhino-launcher', () => {
        return jest.fn().mockImplementation(() => ({
          initialize: jest.fn().mockResolvedValue(undefined),
          launchRhinoWithGrasshopper: jest.fn().mockResolvedValue({ success: true }),
        }));
      });
      jest.mock('../../src/server/file-downloader', () => {
        return jest.fn().mockImplementation(() => ({
          cleanupOldFiles: jest.fn().mockResolvedValue(undefined),
          downloadFile: jest.fn().mockResolvedValue({ success: true }),
        }));
      });
      jest.mock('../../src/server/pairing-manager', () => {
        return jest.fn().mockImplementation(() => ({
          pair: jest.fn().mockResolvedValue({ success: true }),
          unpair: jest.fn(),
          validateSessionToken: jest.fn().mockReturnValue(true),
          getPairingStatus: jest.fn().mockReturnValue({ isPaired: false }),
        }));
      });

      const { createTestServer: freshFactory } = require('../helpers/test-server-factory');
      const ctx = freshFactory({ allowedOrigins: [allowedOrigin] });
      app = ctx.app;
    });

    afterEach(() => {
      delete process.env.NODE_ENV;
    });

    test('allows configured origin', async () => {
      const res = await request(app)
        .get('/status')
        .set('Origin', allowedOrigin);

      expect(res.status).toBe(200);
      expect(res.headers['access-control-allow-origin']).toBe(allowedOrigin);
    });

    test('blocks disallowed origin', async () => {
      const res = await request(app)
        .get('/status')
        .set('Origin', 'https://evil.example.com');

      // CORS error manifests as 500 from the cors middleware error handler
      expect(res.status).toBe(500);
    });
  });

  describe('Preflight (OPTIONS)', () => {
    let app;

    beforeEach(() => {
      delete process.env.NODE_ENV;
      jest.resetModules();
      jest.mock('../../src/rhino-automator/rhino-launcher', () => {
        return jest.fn().mockImplementation(() => ({
          initialize: jest.fn().mockResolvedValue(undefined),
          launchRhinoWithGrasshopper: jest.fn().mockResolvedValue({ success: true }),
        }));
      });
      jest.mock('../../src/server/file-downloader', () => {
        return jest.fn().mockImplementation(() => ({
          cleanupOldFiles: jest.fn().mockResolvedValue(undefined),
          downloadFile: jest.fn().mockResolvedValue({ success: true }),
        }));
      });
      jest.mock('../../src/server/pairing-manager', () => {
        return jest.fn().mockImplementation(() => ({
          pair: jest.fn().mockResolvedValue({ success: true }),
          unpair: jest.fn(),
          validateSessionToken: jest.fn().mockReturnValue(true),
          getPairingStatus: jest.fn().mockReturnValue({ isPaired: false }),
        }));
      });

      const { createTestServer: freshFactory } = require('../helpers/test-server-factory');
      const ctx = freshFactory();
      app = ctx.app;
    });

    test('responds with 204 for preflight', async () => {
      const res = await request(app)
        .options('/status')
        .set('Origin', 'http://localhost:4200')
        .set('Access-Control-Request-Method', 'GET');

      expect(res.status).toBe(204);
    });

    test('allows X-Protra-Helper-Token header', async () => {
      const res = await request(app)
        .options('/launch-rhino')
        .set('Origin', 'http://localhost:4200')
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'X-Protra-Helper-Token');

      expect(res.status).toBe(204);
      const allowedHeaders = res.headers['access-control-allow-headers'];
      expect(allowedHeaders).toBeDefined();
      expect(allowedHeaders.toLowerCase()).toContain('x-protra-helper-token');
    });

    test('allows device-id header', async () => {
      const res = await request(app)
        .options('/pair')
        .set('Origin', 'http://localhost:4200')
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'device-id');

      expect(res.status).toBe(204);
      const allowedHeaders = res.headers['access-control-allow-headers'];
      expect(allowedHeaders).toBeDefined();
      expect(allowedHeaders.toLowerCase()).toContain('device-id');
    });
  });
});
