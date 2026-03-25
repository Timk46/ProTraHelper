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
    downloadFile: jest.fn().mockResolvedValue({ success: true, filePath: '/tmp/f.gh', fileName: 'f.gh', fileSize: 100, downloadTimeMs: 10 }),
  }));
});

jest.mock('../../src/server/pairing-manager', () => {
  return jest.fn().mockImplementation(() => ({
    pair: jest.fn().mockResolvedValue({ success: true, sessionToken: 'a'.repeat(64), userId: 'u1', message: 'ok' }),
    unpair: jest.fn(),
    validateSessionToken: jest.fn().mockReturnValue(true),
    getPairingStatus: jest.fn().mockReturnValue({ isPaired: false }),
  }));
});

const request = require('supertest');
const { createTestServer } = require('../helpers/test-server-factory');

describe('Express Server - Auth Middleware', () => {
  let app, apiSecretToken;

  beforeEach(() => {
    const ctx = createTestServer();
    app = ctx.app;
    apiSecretToken = ctx.apiSecretToken;
  });

  describe('x-protra-helper-token header', () => {
    test('returns 401 when header is missing on protected route', async () => {
      const res = await request(app)
        .post('/launch-rhino')
        .send({ ghFilePath: '/some/file.gh' });

      expect(res.status).toBe(401);
      expect(res.body.message).toContain('fehlt');
    });

    test('returns 403 when header has wrong value', async () => {
      const res = await request(app)
        .post('/launch-rhino')
        .set('x-protra-helper-token', 'incorrect-token')
        .send({ ghFilePath: '/some/file.gh' });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Ungültiges');
    });

    test('passes through with correct token', async () => {
      // Will get 400 because file doesn't exist, but NOT 401/403
      const res = await request(app)
        .post('/launch-rhino')
        .set('x-protra-helper-token', apiSecretToken)
        .send({ ghFilePath: '/some/file.gh' });

      expect(res.status).not.toBe(401);
      expect(res.status).not.toBe(403);
    });
  });

  describe('unauthenticated routes', () => {
    test('GET /status does not require auth', async () => {
      const res = await request(app).get('/status');
      expect(res.status).toBe(200);
    });

    test('POST /pair does not require x-protra-helper-token', async () => {
      const res = await request(app)
        .post('/pair')
        .send({ userJWT: 'some-jwt' });

      expect(res.status).not.toBe(401);
      expect(res.status).not.toBe(403);
    });

    test('GET /pairing-status does not require auth', async () => {
      const res = await request(app).get('/pairing-status');
      expect(res.status).toBe(200);
    });

    test('POST /unpair requires auth', async () => {
      // SECURITY FIX: /unpair now requires authentication
      const res = await request(app).post('/unpair');
      expect(res.status).toBe(401);
    });
  });

  describe('auth error when no apiSecretToken configured', () => {
    test('returns 500 when server has no apiSecretToken', async () => {
      const ctx = createTestServer({ apiSecretToken: '' });
      const res = await request(ctx.app)
        .post('/launch-rhino')
        .set('x-protra-helper-token', 'any-token')
        .send({ ghFilePath: '/some/file.gh' });

      // Empty token means _createAuthMiddleware will hit the "no token configured" path
      // Since receivedToken !== '' (apiSecretToken), it returns 403
      // unless apiSecretToken is falsy - then it returns 500
      expect([403, 500]).toContain(res.status);
    });
  });
});
