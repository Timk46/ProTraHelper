const http = require('node:http');
const { createMockLogger } = require('../helpers/mock-logger');
const { MockStore } = require('../helpers/mock-store');
const PairingManager = require('../../src/server/pairing-manager');

/**
 * Creates a local HTTP server that simulates the HEFL backend
 * /auth/validate-helper-token endpoint.
 */
function createMockBackend(handler) {
  const server = http.createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/auth/validate-helper-token') {
      let body = '';
      req.on('data', (chunk) => { body += chunk; });
      req.on('end', () => {
        const parsed = JSON.parse(body);
        const result = handler(parsed);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      });
    } else {
      res.writeHead(404);
      res.end();
    }
  });
  return server;
}

describe('PairingManager', () => {
  let logger, store, mockServer, backendUrl;

  beforeEach((done) => {
    logger = createMockLogger();
    store = new MockStore();

    // Default handler: valid JWT returns success
    mockServer = createMockBackend((body) => {
      if (body.token === 'valid-jwt') {
        return {
          valid: true,
          userId: 'user-42',
          email: 'student@uni.de',
          name: 'Max Mustermann',
          roles: ['student'],
        };
      }
      return { valid: false, error: 'Invalid token' };
    });

    mockServer.listen(0, () => {
      const port = mockServer.address().port;
      backendUrl = `http://127.0.0.1:${port}`;
      done();
    });
  });

  afterEach((done) => {
    mockServer.close(done);
  });

  // ─── pair() ────────────────────────────────────────────────────
  describe('pair()', () => {
    test('succeeds with valid JWT and returns 64-char hex session token', async () => {
      const pm = new PairingManager(logger, store);
      pm.backendUrl = backendUrl;

      const result = await pm.pair('valid-jwt', 'device-1', 'Test/1.0');

      expect(result.success).toBe(true);
      expect(result.sessionToken).toMatch(/^[a-f0-9]{64}$/);
      expect(result.userId).toBe('user-42');
      expect(result.userName).toBe('Max Mustermann');
      expect(result.expiresIn).toBe(86400); // 24h
    });

    test('fails with invalid JWT', async () => {
      const pm = new PairingManager(logger, store);
      pm.backendUrl = backendUrl;

      const result = await pm.pair('invalid-jwt', 'device-1');

      expect(result.success).toBe(false);
      expect(result.message).toContain('fehlgeschlagen');
    });

    test('rejects auto-discovery URL not in allowed hosts', async () => {
      const pm = new PairingManager(logger, store);
      pm.backendUrl = backendUrl; // Initial URL pointing to mock

      const newUrl = 'https://new-backend.example.com';
      await pm.pair('valid-jwt', null, null, newUrl);

      // SECURITY: URL should NOT be updated — not in allowed hosts
      expect(pm.backendUrl).toBe(backendUrl);
      expect(store.get('backendUrl')).toBeUndefined();
    });

    test('accepts auto-discovery URL in allowed hosts', async () => {
      const pm = new PairingManager(logger, store);
      pm.backendUrl = backendUrl;
      pm.allowedHosts = [...pm.allowedHosts, 'new-backend.example.com'];

      const newUrl = 'https://new-backend.example.com';
      await pm.pair('valid-jwt', null, null, newUrl);

      expect(pm.backendUrl).toBe(newUrl);
      expect(store.get('backendUrl')).toBe(newUrl);
    });

    test('handles network error gracefully', async () => {
      const pm = new PairingManager(logger, store);
      pm.backendUrl = 'http://127.0.0.1:1'; // Port 1 - will refuse connection

      const result = await pm.pair('valid-jwt');

      expect(result.success).toBe(false);
      expect(result.message).toContain('fehlgeschlagen');
    });
  });

  // ─── validateSessionToken() ────────────────────────────────────
  describe('validateSessionToken()', () => {
    test('returns true for valid token', async () => {
      const pm = new PairingManager(logger, store);
      pm.backendUrl = backendUrl;

      const result = await pm.pair('valid-jwt');
      const isValid = pm.validateSessionToken(result.sessionToken);

      expect(isValid).toBe(true);
    });

    test('returns false for wrong token', async () => {
      const pm = new PairingManager(logger, store);
      pm.backendUrl = backendUrl;

      await pm.pair('valid-jwt');
      const isValid = pm.validateSessionToken('wrong-token');

      expect(isValid).toBe(false);
    });

    test('returns false when not paired', () => {
      const pm = new PairingManager(logger, store);

      const isValid = pm.validateSessionToken('any-token');

      expect(isValid).toBe(false);
    });

    test('returns false for expired token', async () => {
      const pm = new PairingManager(logger, store);
      pm.backendUrl = backendUrl;

      const result = await pm.pair('valid-jwt');

      // Force expiry
      pm.sessionExpiry = new Date(Date.now() - 1000);
      const isValid = pm.validateSessionToken(result.sessionToken);

      expect(isValid).toBe(false);
    });
  });

  // ─── unpair() ──────────────────────────────────────────────────
  describe('unpair()', () => {
    test('clears all pairing state', async () => {
      const pm = new PairingManager(logger, store);
      pm.backendUrl = backendUrl;

      await pm.pair('valid-jwt');
      expect(pm.getPairingStatus().isPaired).toBe(true);

      pm.unpair();

      expect(pm.pairedUser).toBeNull();
      expect(pm.sessionToken).toBeNull();
      expect(pm.sessionExpiry).toBeNull();
      expect(pm.getPairingStatus().isPaired).toBe(false);
    });
  });

  // ─── getPairingStatus() ────────────────────────────────────────
  describe('getPairingStatus()', () => {
    test('returns isPaired: false when unpaired', () => {
      const pm = new PairingManager(logger, store);

      expect(pm.getPairingStatus()).toEqual({ isPaired: false });
    });

    test('returns full status when paired', async () => {
      const pm = new PairingManager(logger, store);
      pm.backendUrl = backendUrl;

      await pm.pair('valid-jwt');
      const status = pm.getPairingStatus();

      expect(status.isPaired).toBe(true);
      expect(status.userId).toBe('user-42');
      // SECURITY FIX: email no longer returned from backend
      expect(status.email).toBeUndefined();
      expect(status.name).toBe('Max Mustermann');
      expect(status.pairedAt).toBeInstanceOf(Date);
    });
  });

  // ─── _redactJWT() ─────────────────────────────────────────────
  describe('_redactJWT()', () => {
    test('redacts long JWT tokens', () => {
      const pm = new PairingManager(logger, store);
      const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.signature';

      const redacted = pm._redactJWT(jwt);

      expect(redacted).toBe('eyJhbGciOi...[REDACTED]');
      expect(redacted).not.toContain('payload');
    });

    test('returns [INVALID_JWT] for short strings', () => {
      const pm = new PairingManager(logger, store);

      expect(pm._redactJWT('short')).toBe('[INVALID_JWT]');
      expect(pm._redactJWT('')).toBe('[INVALID_JWT]');
      expect(pm._redactJWT(null)).toBe('[INVALID_JWT]');
    });
  });
});
