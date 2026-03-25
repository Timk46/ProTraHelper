const fs = require('node:fs');
const path = require('node:path');
const https = require('node:https');
const http = require('node:http');

/**
 * FileDownloader handles downloading Grasshopper files from HEFL backend
 * and storing them in temporary directory
 */
class FileDownloader {
  constructor(logger, tempDir, store) {
    this.logger = logger;
    this.tempDir = tempDir;
    this.store = store; // electron-store for persistent config
    // Try to load backend URL from store, fallback to env var, then localhost
    // SECURITY FIX: No hardcoded production URL — must be configured via env or auto-discovery
    this.backendUrl = this.store?.get('backendUrl') || process.env.HEFL_BACKEND_URL || 'http://localhost:3000';

    this.logger.info(`FileDownloader initialized with backend URL: ${this.backendUrl}`);

    // Ensure temp directory exists
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
      this.logger.info(`Temp-Verzeichnis erstellt: ${this.tempDir}`);
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
   * Downloads a Grasshopper file from HEFL backend
   *
   * @param {string} fileId - Unique identifier of the file
   * @param {string} userJWT - JWT token for authentication
   * @returns {Promise<{success: boolean, filePath?: string, fileName?: string, fileSize?: number, message?: string}>}
   */
  async downloadFile(fileId, userJWT) {
    const startTime = Date.now();

    try {
      // IMPORTANT: Always get latest backend URL from store (in case it was updated during pairing)
      const currentBackendUrl = this.store?.get('backendUrl') || this.backendUrl;

      // SECURITY FIX: Redact JWT token in logs
      this.logger.info(`Starte Download von Datei ${fileId} vom HEFL-Backend: ${currentBackendUrl} (JWT: ${this._redactJWT(userJWT)})`);

      // Download URL
      const downloadUrl = `${currentBackendUrl}/files/grasshopper/download/${fileId}`;

      // Make HTTP request with JWT authentication
      const fileData = await this._makeRequest(downloadUrl, userJWT);

      // SECURITY FIX: Sanitize filename to prevent path traversal attacks
      // Use path.basename() to strip directory components, then remove unsafe characters
      const rawFileName = fileData.fileName || `${fileId}.gh`;
      const fileName = path.basename(rawFileName).replace(/[^a-zA-Z0-9._-]/g, '_');

      // Save to temp directory
      const tempFilePath = path.join(this.tempDir, fileName);

      // SECURITY: Verify the resolved path is still within tempDir
      const resolvedPath = path.resolve(tempFilePath);
      const resolvedTempDir = path.resolve(this.tempDir);
      if (!resolvedPath.startsWith(resolvedTempDir)) {
        throw new Error('SECURITY: Path traversal detected in filename');
      }
      await fs.promises.writeFile(tempFilePath, fileData.buffer);

      const downloadTimeMs = Date.now() - startTime;
      const fileSizeBytes = fileData.buffer.length;

      this.logger.info(`Datei erfolgreich heruntergeladen: ${fileName} (${this._formatBytes(fileSizeBytes)}, ${downloadTimeMs}ms)`);

      return {
        success: true,
        filePath: tempFilePath,
        fileName: fileName,
        fileSize: fileSizeBytes,
        downloadTimeMs: downloadTimeMs,
      };
    } catch (error) {
      this.logger.error(`Fehler beim Herunterladen der Datei ${fileId}: ${error.message}`);
      return {
        success: false,
        message: `Download fehlgeschlagen: ${error.message}`,
      };
    }
  }

  /**
   * Makes HTTP request to download file
   *
   * @param {string} url - Download URL
   * @param {string} jwt - JWT token
   * @returns {Promise<{buffer: Buffer, fileName?: string}>}
   * @private
   */
  _makeRequest(url, jwt) {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const protocol = urlObj.protocol === 'https:' ? https : http;

      const options = {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${jwt}`,
        },
      };

      const req = protocol.request(urlObj, options, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
          return;
        }

        const chunks = [];
        let totalSize = 0;
        const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB limit

        res.on('data', (chunk) => {
          totalSize += chunk.length;
          if (totalSize > MAX_FILE_SIZE) {
            req.destroy();
            reject(new Error(`SECURITY: Download exceeds maximum file size (${MAX_FILE_SIZE} bytes)`));
            return;
          }
          chunks.push(chunk);
        });

        res.on('end', () => {
          const buffer = Buffer.concat(chunks);
          const fileName = res.headers['x-filename'] || undefined;

          resolve({
            buffer,
            fileName,
          });
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.setTimeout(30000, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.end();
    });
  }

  /**
   * Formats bytes to human-readable string
   *
   * @param {number} bytes
   * @returns {string}
   * @private
   */
  _formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Cleans up old temp files (older than 24 hours)
   */
  async cleanupOldFiles() {
    try {
      const files = await fs.promises.readdir(this.tempDir);
      const now = Date.now();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours

      let cleanedCount = 0;

      for (const file of files) {
        const filePath = path.join(this.tempDir, file);
        const stats = await fs.promises.stat(filePath);

        if (now - stats.mtimeMs > maxAge) {
          await fs.promises.unlink(filePath);
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        this.logger.info(`${cleanedCount} alte Temp-Dateien bereinigt`);
      }
    } catch (error) {
      this.logger.warn(`Fehler beim Bereinigen alter Temp-Dateien: ${error.message}`);
    }
  }
}

module.exports = FileDownloader;
