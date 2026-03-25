const crypto = require('node:crypto');
const https = require('node:https');
const http = require('node:http');

/**
 * PairingManager handles auto-pairing between web app and Helper-App
 * Validates user JWT tokens and generates session tokens
 */
/**
 * SECURITY: Allowed backend hostnames for URL validation.
 * Prevents MITM attacks by rejecting arbitrary backend URLs.
 * Configure additional hosts via HEFL_ALLOWED_HOSTS environment variable (comma-separated).
 */
const DEFAULT_ALLOWED_HOSTS = [
  'localhost',
  '127.0.0.1',
];

class PairingManager {
  constructor(logger, store) {
    this.logger = logger;
    this.store = store; // electron-store for persistent config

    // SECURITY: Build allowed hosts list from defaults + env var
    const envHosts = process.env.HEFL_ALLOWED_HOSTS
      ? process.env.HEFL_ALLOWED_HOSTS.split(',').map(h => h.trim()).filter(Boolean)
      : [];
    this.allowedHosts = [...DEFAULT_ALLOWED_HOSTS, ...envHosts];

    // Try to load backend URL from store, fallback to env var, then localhost
    // SECURITY FIX: No hardcoded production URL — must be configured via env or auto-discovery
    const storedUrl = this.store?.get('backendUrl');
    const envUrl = process.env.HEFL_BACKEND_URL;
    const candidateUrl = storedUrl || envUrl || 'http://localhost:3000';

    // Validate stored/env URL before using it
    if (this._validateBackendUrl(candidateUrl)) {
      this.backendUrl = candidateUrl;
    } else {
      this.logger.warn(`SECURITY: Stored/env backend URL rejected: ${candidateUrl}. Falling back to localhost.`);
      this.backendUrl = 'http://localhost:3000';
    }

    this.pairedUser = null;
    this.sessionToken = null;
    this.sessionExpiry = null;

    this.logger.info(`PairingManager initialized with backend URL: ${this.backendUrl}`);
  }

  /**
   * SECURITY: Validates a backend URL against the allowed hosts whitelist.
   * Enforces HTTPS for non-localhost URLs to prevent MITM attacks.
   *
   * @param {string} url - URL to validate
   * @returns {boolean} - true if URL is allowed
   * @private
   */
  _validateBackendUrl(url) {
    try {
      const parsed = new URL(url);

      // SECURITY: Enforce HTTPS for non-localhost URLs
      const isLocalhost = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
      if (!isLocalhost && parsed.protocol !== 'https:') {
        this.logger.warn(`SECURITY: Rejected non-HTTPS URL for non-localhost host: ${url}`);
        return false;
      }

      // Check against allowed hosts whitelist
      if (!this.allowedHosts.includes(parsed.hostname)) {
        this.logger.warn(`SECURITY: Host '${parsed.hostname}' not in allowed hosts list: [${this.allowedHosts.join(', ')}]`);
        return false;
      }

      return true;
    } catch {
      this.logger.warn(`SECURITY: Invalid URL format: ${url}`);
      return false;
    }
  }

  /**
   * SECURITY: Redacts JWT token for logging (prevents token exposure in logs)
   * @param {string} jwt - JWT token to redact
   * @returns {string} - Redacted JWT (first 10 chars + [REDACTED])
   * @private
   */
  _redactJWT(jwt) {
    if (!jwt || jwt.length < 20) {
      return '[INVALID_JWT]';
    }
    return `${jwt.substring(0, 10)}...[REDACTED]`;
  }

  /**
   * Pairs Helper-App with a user via JWT validation
   *
   * @param {string} userJWT - JWT token from web app
   * @param {string} deviceId - Optional device ID
   * @param {string} userAgent - Optional user agent
   * @param {string} backendUrl - Optional backend URL for auto-discovery
   * @returns {Promise<{success: boolean, sessionToken?: string, userId?: string, userName?: string, expiresIn?: number, message: string}>}
   */
  async pair(userJWT, deviceId, userAgent, backendUrl) {
    try {
      // SECURITY FIX: Redact JWT token in logs
      this.logger.info(`Auto-Pairing gestartet (deviceId: ${deviceId || 'N/A'}, JWT: ${this._redactJWT(userJWT)})`);

      // Auto-discovery: If backend URL is provided, validate and store it
      if (backendUrl && backendUrl !== this.backendUrl) {
        if (this._validateBackendUrl(backendUrl)) {
          this.logger.info(`Auto-discovery: Updating backend URL from ${this.backendUrl} to ${backendUrl}`);
          this.backendUrl = backendUrl;
          if (this.store) {
            this.store.set('backendUrl', backendUrl);
            this.logger.info(`Backend URL saved to config: ${backendUrl}`);
          }
        } else {
          this.logger.warn(`SECURITY: Rejected auto-discovery backend URL: ${backendUrl}`);
        }
      }

      // Validate JWT with backend
      const validationResult = await this._validateJWTWithBackend(userJWT);

      if (!validationResult.valid) {
        // SECURITY FIX: Don't log JWT in error messages
        this.logger.warn(`JWT-Validierung fehlgeschlagen: ${validationResult.error}`);
        return {
          success: false,
          message: `JWT-Validierung fehlgeschlagen: ${validationResult.error}`,
        };
      }

      // Generate session token
      const sessionToken = this._generateSessionToken();
      const expiresIn = 24 * 60 * 60; // 24 hours in seconds
      const expiryDate = new Date(Date.now() + expiresIn * 1000);

      // Store pairing information (SECURITY: backend no longer returns email/roles)
      this.pairedUser = {
        userId: validationResult.userId,
        name: validationResult.name,
        deviceId,
        userAgent,
        pairedAt: new Date(),
      };
      this.sessionToken = sessionToken;
      this.sessionExpiry = expiryDate;

      this.logger.info(`Auto-Pairing erfolgreich: User ${validationResult.userId} (${validationResult.name})`);

      return {
        success: true,
        sessionToken,
        userId: validationResult.userId,
        userName: validationResult.name,
        expiresIn,
        createdAt: new Date().toISOString(),
        message: 'Auto-Pairing erfolgreich',
      };
    } catch (error) {
      this.logger.error(`Auto-Pairing Fehler: ${error.message}`);
      return {
        success: false,
        message: `Auto-Pairing fehlgeschlagen: ${error.message}`,
      };
    }
  }

  /**
   * Validates a JWT token with HEFL backend
   *
   * @param {string} jwt - JWT token to validate
   * @returns {Promise<{valid: boolean, userId?: string, email?: string, name?: string, roles?: string[], error?: string}>}
   * @private
   */
  async _validateJWTWithBackend(jwt) {
    return new Promise((resolve, reject) => {
      const validationUrl = `${this.backendUrl}/auth/validate-helper-token`;
      const urlObj = new URL(validationUrl);
      const protocol = urlObj.protocol === 'https:' ? https : http;

      const postData = JSON.stringify({
        token: jwt,
      });

      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
        },
      };

      const req = protocol.request(urlObj, options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const result = JSON.parse(data);
            resolve(result);
          } catch (error) {
            reject(new Error(`Invalid JSON response: ${error.message}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.setTimeout(10000, () => {
        req.destroy();
        reject(new Error('JWT validation timeout'));
      });

      req.write(postData);
      req.end();
    });
  }

  /**
   * Generates a secure random session token
   *
   * @returns {string}
   * @private
   */
  _generateSessionToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Validates a session token
   *
   * @param {string} token - Session token to validate
   * @returns {boolean}
   */
  validateSessionToken(token) {
    if (!this.sessionToken || !this.pairedUser) {
      return false;
    }

    // SECURITY FIX: Use timing-safe comparison to prevent timing attacks
    const tokenBuf = Buffer.from(token);
    const sessionBuf = Buffer.from(this.sessionToken);
    if (tokenBuf.length !== sessionBuf.length || !crypto.timingSafeEqual(tokenBuf, sessionBuf)) {
      return false;
    }

    // Check if session expired
    if (this.sessionExpiry && new Date() > this.sessionExpiry) {
      this.logger.warn('Session token expired');
      this.unpair();
      return false;
    }

    return true;
  }

  /**
   * Unpairs the current user
   */
  unpair() {
    if (this.pairedUser) {
      this.logger.info(`Unpaired user ${this.pairedUser.userId} (${this.pairedUser.name})`);
    }
    this.pairedUser = null;
    this.sessionToken = null;
    this.sessionExpiry = null;
  }

  /**
   * Gets current pairing status
   *
   * @returns {{isPaired: boolean, userId?: string, email?: string, name?: string, pairedAt?: Date}}
   */
  getPairingStatus() {
    if (!this.pairedUser || !this.sessionToken) {
      return { isPaired: false };
    }

    return {
      isPaired: true,
      userId: this.pairedUser.userId,
      name: this.pairedUser.name,
      pairedAt: this.pairedUser.pairedAt,
    };
  }

  /**
   * Gets paired user information (if paired)
   *
   * @returns {object|null}
   */
  getPairedUser() {
    return this.pairedUser;
  }
}

module.exports = PairingManager;
