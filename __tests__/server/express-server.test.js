// Mock dependencies BEFORE requiring the module under test
jest.mock('../../src/rhino-automator/rhino-launcher', () => {
  return jest.fn().mockImplementation(() => ({
    initialize: jest.fn().mockResolvedValue(undefined),
    launchRhinoWithGrasshopper: jest.fn().mockResolvedValue({
      success: true,
      message: 'Rhino gestartet',
      processId: 12345,
      fileName: 'test.gh',
      executionType: 'com',
    }),
  }));
});

jest.mock('../../src/server/file-downloader', () => {
  return jest.fn().mockImplementation(() => ({
    cleanupOldFiles: jest.fn().mockResolvedValue(undefined),
    downloadFile: jest.fn().mockResolvedValue({
      success: true,
      filePath: '/tmp/test/downloaded.gh',
      fileName: 'downloaded.gh',
      fileSize: 1024,
      downloadTimeMs: 150,
    }),
  }));
});

jest.mock('../../src/server/pairing-manager', () => {
  return jest.fn().mockImplementation(() => ({
    pair: jest.fn().mockResolvedValue({
      success: true,
      sessionToken: 'a'.repeat(64),
      userId: 'user-123',
      userName: 'Test User',
      expiresIn: 86400,
      createdAt: new Date().toISOString(),
      message: 'Auto-Pairing erfolgreich',
    }),
    unpair: jest.fn(),
    validateSessionToken: jest.fn().mockReturnValue(true),
    getPairingStatus: jest.fn().mockReturnValue({ isPaired: false }),
  }));
});

const request = require('supertest');
const { createTestServer } = require('../helpers/test-server-factory');

describe('Express Server - HTTP Endpoints', () => {
  let server, app, logger, rhinoPathManager, apiSecretToken;

  beforeEach(() => {
    const ctx = createTestServer();
    server = ctx.server;
    app = ctx.app;
    logger = ctx.logger;
    rhinoPathManager = ctx.rhinoPathManager;
    apiSecretToken = ctx.apiSecretToken;
  });

  // ─── GET /status ───────────────────────────────────────────────
  describe('GET /status', () => {
    test('returns 200 with server info', async () => {
      rhinoPathManager.getRhinoPath.mockResolvedValue('/usr/bin/rhino');

      const res = await request(app).get('/status');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status', 'running');
      expect(res.body).toHaveProperty('version');
      expect(res.body).toHaveProperty('serverTime');
      expect(res.body).toHaveProperty('rhinoPathConfigured', true);
      // SECURITY FIX: rhinoPath no longer exposed in response
      expect(res.body).not.toHaveProperty('rhinoPath');
    });

    test('reports rhinoPathConfigured=false when no path', async () => {
      rhinoPathManager.getRhinoPath.mockResolvedValue(null);

      const res = await request(app).get('/status');

      expect(res.status).toBe(200);
      expect(res.body.rhinoPathConfigured).toBe(false);
      // SECURITY FIX: rhinoPath no longer exposed in response
      expect(res.body.rhinoPath).toBeUndefined();
    });

    test('does not require authentication', async () => {
      const res = await request(app).get('/status');
      expect(res.status).toBe(200);
    });
  });

  // ─── POST /pair ────────────────────────────────────────────────
  describe('POST /pair', () => {
    test('returns 200 with sessionToken on success', async () => {
      const res = await request(app)
        .post('/pair')
        .send({ userJWT: 'valid-jwt-token', deviceId: 'dev-1' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.sessionToken).toHaveLength(64);
    });

    test('returns 400 when userJWT is missing', async () => {
      const res = await request(app)
        .post('/pair')
        .send({ deviceId: 'dev-1' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    test('returns 400 when userJWT is not a string', async () => {
      const res = await request(app)
        .post('/pair')
        .send({ userJWT: 12345 });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    test('returns 401 when backend rejects JWT', async () => {
      server.pairingManager.pair.mockResolvedValue({
        success: false,
        message: 'JWT-Validierung fehlgeschlagen',
      });

      const res = await request(app)
        .post('/pair')
        .send({ userJWT: 'invalid-jwt' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    test('returns 500 on internal error', async () => {
      server.pairingManager.pair.mockRejectedValue(new Error('Connection refused'));

      const res = await request(app)
        .post('/pair')
        .send({ userJWT: 'valid-jwt' });

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });

    test('passes backendUrl for auto-discovery', async () => {
      await request(app)
        .post('/pair')
        .send({ userJWT: 'valid-jwt', backendUrl: 'https://custom-backend.example.com' });

      expect(server.pairingManager.pair).toHaveBeenCalledWith(
        'valid-jwt',
        undefined,
        undefined,
        'https://custom-backend.example.com'
      );
    });
  });

  // ─── GET /pairing-status ──────────────────────────────────────
  describe('GET /pairing-status', () => {
    test('returns unpaired by default', async () => {
      const res = await request(app).get('/pairing-status');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ isPaired: false });
    });

    test('returns paired status after pairing', async () => {
      server.pairingManager.getPairingStatus.mockReturnValue({
        isPaired: true,
        userId: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        pairedAt: new Date(),
      });

      const res = await request(app).get('/pairing-status');

      expect(res.status).toBe(200);
      expect(res.body.isPaired).toBe(true);
      expect(res.body.userId).toBe('user-123');
    });
  });

  // ─── POST /unpair ─────────────────────────────────────────────
  describe('POST /unpair', () => {
    test('returns 200 and calls unpair() with valid auth', async () => {
      // SECURITY FIX: /unpair now requires authentication
      const res = await request(app)
        .post('/unpair')
        .set('x-protra-helper-token', 'test-secret-token');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(server.pairingManager.unpair).toHaveBeenCalled();
    });

    test('returns 401 without auth', async () => {
      const res = await request(app).post('/unpair');
      expect(res.status).toBe(401);
    });
  });

  // ─── POST /launch-rhino ───────────────────────────────────────
  describe('POST /launch-rhino', () => {
    const validGhPath = __filename; // Use this test file as a standin for "exists" check

    test('returns 401 without auth token', async () => {
      const res = await request(app)
        .post('/launch-rhino')
        .send({ ghFilePath: validGhPath });

      expect(res.status).toBe(401);
    });

    test('returns 403 with wrong auth token', async () => {
      const res = await request(app)
        .post('/launch-rhino')
        .set('x-protra-helper-token', 'wrong-token')
        .send({ ghFilePath: validGhPath });

      expect(res.status).toBe(403);
    });

    test('returns 400 when ghFilePath is missing', async () => {
      const res = await request(app)
        .post('/launch-rhino')
        .set('x-protra-helper-token', apiSecretToken)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    test('returns 400 when ghFilePath does not exist', async () => {
      const res = await request(app)
        .post('/launch-rhino')
        .set('x-protra-helper-token', apiSecretToken)
        .send({ ghFilePath: '/nonexistent/path/file.gh' });

      expect(res.status).toBe(400);
    });

    test('returns 400 when file extension is invalid', async () => {
      // Use a path that exists but is not .gh/.ghx
      const res = await request(app)
        .post('/launch-rhino')
        .set('x-protra-helper-token', apiSecretToken)
        .send({ ghFilePath: __filename }); // .js extension

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('.gh');
    });
  });

  // ─── POST /launch-rhino-with-download ─────────────────────────
  describe('POST /launch-rhino-with-download', () => {
    test('returns 400 when fileId is missing', async () => {
      const res = await request(app)
        .post('/launch-rhino-with-download')
        .send({ sessionToken: 'abc' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    test('returns 400 when fileId has invalid format', async () => {
      const res = await request(app)
        .post('/launch-rhino-with-download')
        .send({ fileId: '../../../etc/passwd', sessionToken: 'abc' });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Ungültiges fileId Format');
    });

    test('rejects fileId injection with special chars', async () => {
      const res = await request(app)
        .post('/launch-rhino-with-download')
        .send({ fileId: 'file;rm -rf /', sessionToken: 'abc' });

      expect(res.status).toBe(400);
    });

    test('returns 401 without auth (no sessionToken nor userJWT)', async () => {
      const res = await request(app)
        .post('/launch-rhino-with-download')
        .send({ fileId: 'valid-file-id' });

      expect(res.status).toBe(401);
    });

    test('returns 401 with expired sessionToken', async () => {
      server.pairingManager.validateSessionToken.mockReturnValue(false);

      const res = await request(app)
        .post('/launch-rhino-with-download')
        .send({ fileId: 'valid-file-id', sessionToken: 'expired-token' });

      expect(res.status).toBe(401);
      expect(res.body.message).toContain('sessionToken');
    });

    test('returns 200 on success with valid sessionToken + userJWT', async () => {
      rhinoPathManager.getRhinoPath.mockResolvedValue('C:\\Rhino\\Rhino.exe');

      const res = await request(app)
        .post('/launch-rhino-with-download')
        .send({
          fileId: 'abc123',
          sessionToken: 'valid-session',
          userJWT: 'valid-jwt',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.fileName).toBeDefined();
    });

    test('returns 500 when download fails', async () => {
      rhinoPathManager.getRhinoPath.mockResolvedValue('C:\\Rhino\\Rhino.exe');
      server.fileDownloader.downloadFile.mockResolvedValue({
        success: false,
        message: 'HTTP 404: Not Found',
      });

      const res = await request(app)
        .post('/launch-rhino-with-download')
        .send({
          fileId: 'abc123',
          sessionToken: 'valid-session',
          userJWT: 'valid-jwt',
        });

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });

    test('returns 500 when Rhino launch fails', async () => {
      rhinoPathManager.getRhinoPath.mockResolvedValue('C:\\Rhino\\Rhino.exe');
      server.rhinoLauncher.launchRhinoWithGrasshopper.mockResolvedValue({
        success: false,
        message: 'Rhino not responding',
      });

      const res = await request(app)
        .post('/launch-rhino-with-download')
        .send({
          fileId: 'abc123',
          sessionToken: 'valid-session',
          userJWT: 'valid-jwt',
        });

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });

    test('returns 500 when no Rhino path configured', async () => {
      rhinoPathManager.getRhinoPath.mockResolvedValue(null);

      const res = await request(app)
        .post('/launch-rhino-with-download')
        .send({
          fileId: 'abc123',
          sessionToken: 'valid-session',
          userJWT: 'valid-jwt',
        });

      expect(res.status).toBe(500);
      expect(res.body.message).toContain('Rhino 8 Pfad');
    });
  });
});
