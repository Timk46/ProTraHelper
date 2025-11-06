const crypto = require('node:crypto');
const https = require('node:https');
const http = require('node:http');

/**
 * PairingManager handles auto-pairing between web app and Helper-App
 * Validates user JWT tokens and generates session tokens
 */
class PairingManager {
  constructor(logger, store) {
    this.logger = logger;
    this.store = store; // electron-store for persistent config
    // Try to load backend URL from store, fallback to env var, then localhost
    this.backendUrl = this.store?.get('backendUrl') || process.env.HEFL_BACKEND_URL || 'http://localhost:3000';
    this.pairedUser = null;
    this.sessionToken = null;
    this.sessionExpiry = null;

    this.logger.info(`PairingManager initialized with backend URL: ${this.backendUrl}`);
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
      this.logger.info(`Auto-Pairing gestartet (deviceId: ${deviceId || 'N/A'})`);

      // Auto-discovery: If backend URL is provided, store it
      if (backendUrl && backendUrl !== this.backendUrl) {
        this.logger.info(`Auto-discovery: Updating backend URL from ${this.backendUrl} to ${backendUrl}`);
        this.backendUrl = backendUrl;
        if (this.store) {
          this.store.set('backendUrl', backendUrl);
          this.logger.info(`Backend URL saved to config: ${backendUrl}`);
        }
      }

      // Validate JWT with backend
      const validationResult = await this._validateJWTWithBackend(userJWT);

      if (!validationResult.valid) {
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

      // Store pairing information
      this.pairedUser = {
        userId: validationResult.userId,
        email: validationResult.email,
        name: validationResult.name,
        roles: validationResult.roles,
        deviceId,
        userAgent,
        pairedAt: new Date(),
      };
      this.sessionToken = sessionToken;
      this.sessionExpiry = expiryDate;

      this.logger.info(`Auto-Pairing erfolgreich: User ${validationResult.userId} (${validationResult.email})`);

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

    // Check if token matches
    if (token !== this.sessionToken) {
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
      this.logger.info(`Unpaired user ${this.pairedUser.userId} (${this.pairedUser.email})`);
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
      email: this.pairedUser.email,
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
