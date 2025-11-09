const express = require('express');
const cors = require('cors');
const path = require('node:path');
const fs = require('node:fs');
const rateLimit = require('express-rate-limit');
const RhinoLauncher = require('../rhino-automator/rhino-launcher');
const FileDownloader = require('./file-downloader');
const PairingManager = require('./pairing-manager');

class AppServer {
  constructor(logger, rhinoPathManager, tempDir, allowedOrigins, apiSecretToken) {
    this.logger = logger;
    this.rhinoPathManager = rhinoPathManager;
    this.tempDir = tempDir; // Für temporäre Skriptdateien
    this.allowedOrigins = allowedOrigins || ['http://localhost:4200']; // Fallback, falls undefined
    this.apiSecretToken = apiSecretToken;
    this.app = express();
    this.server = null;
    this.port = process.env.PROTRA_HELPER_PORT || 3001; // Konfigurierbar via Umgebungsvariable
    // PHASE 1: Python Script Integration - RhinoLauncher mit erweiterter Funktionalität
    this.rhinoLauncher = new RhinoLauncher(this.logger);
    this._isRunning = false;

    // PHASE 2: Server-Download & Auto-Pairing Integration
    this.fileDownloader = new FileDownloader(this.logger, this.tempDir, rhinoPathManager?.store);
    this.pairingManager = new PairingManager(this.logger, rhinoPathManager?.store);

    if (!this.apiSecretToken) {
        this.logger.error('KRITISCH: Kein API Secret Token beim Initialisieren des AppServers bereitgestellt!');
        // In einem echten Szenario könnte hier ein Fehler geworfen oder die App beendet werden.
    }

    this._configureMiddleware();
    this._createRateLimiters();
    this._configureRoutes();

    // SECURITY FIX: RhinoLauncher initialization moved to start() method to prevent race condition
    // (was: this._initializeRhinoLauncher() - called without await in constructor)

    // PHASE 2: Cleanup old temp files on startup
    this._cleanupOldTempFiles();
  }

  /**
   * SECURITY: Creates rate limiters to prevent DOS and brute-force attacks
   * @private
   */
  _createRateLimiters() {
    // General API limiter - max 100 requests per 15 minutes per IP
    this.apiLimiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // Max 100 requests per windowMs
      message: 'Too many requests from this IP, please try again later',
      standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
      legacyHeaders: false, // Disable `X-RateLimit-*` headers
    });

    // Strict pairing limiter - max 10 pairing attempts per hour
    this.pairingLimiter = rateLimit({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 10, // Max 10 pairing attempts per hour
      skipSuccessfulRequests: true, // Don't count successful pairings
      message: 'Too many pairing attempts, please try again later',
      standardHeaders: true,
      legacyHeaders: false,
    });

    this.logger.info('Rate limiters configured: API (100/15min), Pairing (10/hour)');
  }

  _createAuthMiddleware() {
    return (req, res, next) => {
      if (!this.apiSecretToken) {
        this.logger.error('Authentifizierungs-Middleware: Kein API Secret Token konfiguriert. Zugriff verweigert.');
        return res.status(500).json({ success: false, message: 'Server-Konfigurationsfehler.' });
      }

      const tokenHeader = 'x-protra-helper-token'; // Header-Name für das Token
      const receivedToken = req.header(tokenHeader);

      if (!receivedToken) {
        this.logger.warn(`Authentifizierungs-Middleware: Fehlender ${tokenHeader} Header. Zugriff verweigert für ${req.method} ${req.originalUrl}`);
        return res.status(401).json({ success: false, message: 'Authentifizierungstoken fehlt.' });
      }

      if (receivedToken !== this.apiSecretToken) {
        this.logger.warn(`Authentifizierungs-Middleware: Ungültiges Token empfangen. Zugriff verweigert für ${req.method} ${req.originalUrl}`);
        return res.status(403).json({ success: false, message: 'Ungültiges Authentifizierungstoken.' });
      }

      this.logger.info(`Authentifizierungs-Middleware: Gültiges Token empfangen für ${req.method} ${req.originalUrl}. Zugriff gewährt.`);
      next();
    };
  }

  _configureMiddleware() {
    // SECURITY FIX: CORS-Konfiguration mit Environment-Check
    const isProduction = process.env.NODE_ENV === 'production';

    const corsOptions = {
      origin: (origin, callback) => {
        if (isProduction) {
          // Production: Strikte Origin-Validierung
          const allowedOrigins = this.allowedOrigins || [];

          if (allowedOrigins.length === 0) {
            this.logger.error('CRITICAL: Production mode requires configured allowedOrigins!');
            callback(new Error('CORS not configured for production'));
            return;
          }

          if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
          } else {
            this.logger.warn(`CORS blocked request from origin: ${origin}`);
            callback(new Error('Not allowed by CORS'));
          }
        } else {
          // Development: Allow all origins
          callback(null, true);
        }
      },
      methods: "GET,POST,OPTIONS",
      allowedHeaders: [
        "Content-Type",
        "Authorization",
        "X-Protra-Helper-Token",
        "device-id",
        "Device-ID", // Unterstützt beide Schreibweisen für bessere Kompatibilität
        "Accept"
      ],
      credentials: true,
      preflightContinue: false,
      optionsSuccessStatus: 204
    };

    this.app.use(cors(corsOptions));

    if (isProduction) {
      this.logger.info(`CORS-Middleware konfiguriert (PRODUCTION MODE - Allowed origins: ${this.allowedOrigins.join(', ')})`);
    } else {
      this.logger.info('CORS-Middleware konfiguriert (DEVELOPMENT MODE - Alle Origins erlaubt)');
    }

    // JSON Body Parser
    this.app.use(express.json({ limit: '1mb' })); // Limit für Request-Body-Größe
    this.logger.info('JSON Body Parser Middleware konfiguriert.');

    // Einfache Request-Logging Middleware
    this.app.use((req, res, next) => {
      this.logger.info(`HTTP Request: ${req.method} ${req.originalUrl} (Origin: ${req.headers.origin || 'N/A'})`);
      next();
    });
  }

  /**
   * PHASE 1: Initialisiert RhinoLauncher mit Python Script Support
   */
  async _initializeRhinoLauncher() {
    try {
      await this.rhinoLauncher.initialize();
      this.logger.info('RhinoLauncher mit Python Script Integration initialisiert');
    } catch (error) {
      this.logger.error(`Fehler beim Initialisieren des RhinoLaunchers: ${error.message}`);
    }
  }

  /**
   * PHASE 2: Bereinigt alte temporäre Dateien beim Start
   */
  async _cleanupOldTempFiles() {
    try {
      await this.fileDownloader.cleanupOldFiles();
    } catch (error) {
      this.logger.error(`Fehler beim Bereinigen alter Temp-Dateien: ${error.message}`);
    }
  }

  _configureRoutes() {
    const authMiddleware = this._createAuthMiddleware();

    // GET /status
    this.app.get('/status', async (req, res) => {
      this.logger.info('GET /status aufgerufen.');
      const rhinoPath = await this.rhinoPathManager.getRhinoPath();
      res.status(200).json({
        status: 'running',
        version: require('../../package.json').version, // Holt Version aus package.json
        serverTime: new Date().toISOString(),
        rhinoPathConfigured: !!rhinoPath,
        rhinoPath: rhinoPath || 'Nicht konfiguriert',
      });
    });

    // POST /launch-rhino - Geschützt durch Authentifizierungs-Middleware + Rate Limiting
    this.app.post('/launch-rhino', this.apiLimiter, authMiddleware, async (req, res) => {
      this.logger.info('POST /launch-rhino aufgerufen (nach Authentifizierung).');
      const { ghFilePath } = req.body;

      if (!ghFilePath || typeof ghFilePath !== 'string') {
        this.logger.warn('/launch-rhino: Ungültiger oder fehlender ghFilePath.');
        return res.status(400).json({ success: false, message: 'ghFilePath ist erforderlich und muss ein String sein.' });
      }

      // Validierung des Dateipfades (grundlegend)
      if (!fs.existsSync(ghFilePath)) {
        this.logger.warn(`/launch-rhino: ghFilePath existiert nicht: ${ghFilePath}`);
        return res.status(400).json({ success: false, message: `Die angegebene Datei existiert nicht: ${ghFilePath}` });
      }
      if (!ghFilePath.toLowerCase().endsWith('.gh') && !ghFilePath.toLowerCase().endsWith('.ghx')) {
        this.logger.warn(`/launch-rhino: ghFilePath hat keine gültige Endung (.gh, .ghx): ${ghFilePath}`);
        return res.status(400).json({ success: false, message: 'Die Datei muss eine .gh oder .ghx Endung haben.' });
      }

      const rhinoExecutablePath = await this.rhinoPathManager.getRhinoPath();
      if (!rhinoExecutablePath) {
        this.logger.error('/launch-rhino: Rhino 8 Installationspfad nicht konfiguriert oder gefunden.');
        return res.status(500).json({ success: false, message: 'Rhino 8 Pfad nicht konfiguriert. Bitte im Tray-Menü einstellen.' });
      }

      try {
        this.logger.info(`Versuche Rhino zu starten mit Datei: ${ghFilePath} und Rhino-Exe: ${rhinoExecutablePath}`);
        const result = await this.rhinoLauncher.launchRhinoWithGrasshopper(rhinoExecutablePath, ghFilePath);
        
        if (result.success) {
            this.logger.info(`/launch-rhino erfolgreich für: ${ghFilePath} (${result.executionType || 'unknown'})`);
            
            // PHASE 1: Erweiterte Response mit Python Script Integration Details
            const response = { 
              success: true, 
              message: result.message || 'Rhino/Grasshopper gestartet.',
              commandUsed: result.commandUsed || undefined,
              processId: result.processId || undefined,
              fileName: result.fileName || undefined,
              executionType: result.executionType || 'unknown' // 'python' oder 'cli'
            };

            // Python-spezifische Details hinzufügen
            if (result.executionType === 'python') {
              response.pythonMode = result.pythonMode || undefined;
              response.scriptPath = result.scriptPath || undefined;
              response.features = {
                pythonScriptIntegration: true,
                multiUserSupport: true,
                advancedAutomation: true
              };
            }

            return res.status(200).json(response);
            
        } else {
            this.logger.error(`/launch-rhino fehlgeschlagen für ${ghFilePath}: ${result.message}`);
            return res.status(500).json({ 
              success: false, 
              message: result.message || 'Fehler beim Starten von Rhino/Grasshopper.',
              executionType: result.executionType || 'unknown'
            });
        }
      } catch (error) {
        this.logger.error(`/launch-rhino: Kritischer Fehler beim Versuch, Rhino zu starten: ${error.message}`, error);
        return res.status(500).json({ success: false, message: `Interner Serverfehler: ${error.message}` });
      }
    });

    // PHASE 2: POST /pair - Auto-Pairing Endpoint + Strict Rate Limiting
    this.app.post('/pair', this.pairingLimiter, async (req, res) => {
      this.logger.info('POST /pair aufgerufen (Auto-Pairing)');
      const { userJWT, deviceId, userAgent, backendUrl } = req.body;

      if (!userJWT || typeof userJWT !== 'string') {
        this.logger.warn('/pair: Fehlender oder ungültiger userJWT');
        return res.status(400).json({
          success: false,
          message: 'userJWT ist erforderlich und muss ein String sein.'
        });
      }

      try {
        // Auto-discovery: Pass backendUrl if provided by frontend
        const result = await this.pairingManager.pair(userJWT, deviceId, userAgent, backendUrl);

        if (result.success) {
          this.logger.info(`/pair erfolgreich: User ${result.userId} gepaart`);
          return res.status(200).json(result);
        } else {
          this.logger.warn(`/pair fehlgeschlagen: ${result.message}`);
          return res.status(401).json(result);
        }
      } catch (error) {
        this.logger.error(`/pair: Kritischer Fehler: ${error.message}`);
        return res.status(500).json({
          success: false,
          message: `Interner Serverfehler: ${error.message}`
        });
      }
    });

    // PHASE 2: GET /pairing-status - Pairing Status abfragen
    this.app.get('/pairing-status', (req, res) => {
      this.logger.info('GET /pairing-status aufgerufen');
      const status = this.pairingManager.getPairingStatus();
      res.status(200).json(status);
    });

    // PHASE 2: POST /unpair - Pairing aufheben
    this.app.post('/unpair', (req, res) => {
      this.logger.info('POST /unpair aufgerufen');
      this.pairingManager.unpair();
      res.status(200).json({
        success: true,
        message: 'Pairing aufgehoben'
      });
    });

    // PHASE 2: POST /launch-rhino-with-download - Launch Rhino mit Server-Download + Rate Limiting
    this.app.post('/launch-rhino-with-download', this.apiLimiter, async (req, res) => {
      this.logger.info('POST /launch-rhino-with-download aufgerufen (Server-Download + Auto-Pairing)');
      const { fileId, userJWT, sessionToken, rhinoPath, showViewport, batchMode } = req.body;

      // SECURITY FIX: Validate fileId format (alphanumeric, hyphens, underscores only)
      const FILE_ID_PATTERN = /^[a-zA-Z0-9-_]{1,64}$/;

      if (!fileId || typeof fileId !== 'string') {
        this.logger.warn('/launch-rhino-with-download: Fehlender oder ungültiger fileId');
        return res.status(400).json({
          success: false,
          message: 'fileId ist erforderlich und muss ein String sein.'
        });
      }

      if (!FILE_ID_PATTERN.test(fileId)) {
        this.logger.warn(`/launch-rhino-with-download: Ungültiges fileId Format: ${fileId}`);
        return res.status(400).json({
          success: false,
          message: 'Ungültiges fileId Format. Nur alphanumerische Zeichen, Bindestriche und Unterstriche erlaubt (max 64 Zeichen).'
        });
      }

      // Check authentication: either sessionToken or userJWT
      if (!sessionToken && !userJWT) {
        this.logger.warn('/launch-rhino-with-download: Weder sessionToken noch userJWT vorhanden');
        return res.status(401).json({
          success: false,
          message: 'Authentifizierung erforderlich: sessionToken oder userJWT fehlt.'
        });
      }

      // Validate session token if provided
      if (sessionToken && !this.pairingManager.validateSessionToken(sessionToken)) {
        this.logger.warn('/launch-rhino-with-download: Ungültiger oder abgelaufener sessionToken');
        return res.status(401).json({
          success: false,
          message: 'Ungültiger oder abgelaufener sessionToken. Bitte neu pairen.'
        });
      }

      // If no session token, JWT is required
      const jwt = userJWT;
      if (!jwt) {
        this.logger.warn('/launch-rhino-with-download: JWT fehlt');
        return res.status(401).json({
          success: false,
          message: 'JWT erforderlich'
        });
      }

      try {
        // Step 1: Download file from HEFL backend
        this.logger.info(`Downloading file ${fileId} from HEFL backend...`);
        const downloadResult = await this.fileDownloader.downloadFile(fileId, jwt);

        if (!downloadResult.success) {
          this.logger.error(`/launch-rhino-with-download: Download fehlgeschlagen: ${downloadResult.message}`);
          return res.status(500).json({
            success: false,
            message: downloadResult.message
          });
        }

        const localFilePath = downloadResult.filePath;
        this.logger.info(`Datei erfolgreich heruntergeladen: ${localFilePath}`);

        // Step 2: Get Rhino path
        const rhinoExecutablePath = rhinoPath || await this.rhinoPathManager.getRhinoPath();
        if (!rhinoExecutablePath) {
          this.logger.error('/launch-rhino-with-download: Rhino 8 Installationspfad nicht konfiguriert');
          return res.status(500).json({
            success: false,
            message: 'Rhino 8 Pfad nicht konfiguriert. Bitte im Tray-Menü einstellen.'
          });
        }

        // Step 3: Launch Rhino with downloaded file
        this.logger.info(`Starte Rhino mit heruntergeladener Datei: ${localFilePath}`);
        const launchResult = await this.rhinoLauncher.launchRhinoWithGrasshopper(
          rhinoExecutablePath,
          localFilePath,
          { batchMode, showViewport }
        );

        if (launchResult.success) {
          this.logger.info(`/launch-rhino-with-download erfolgreich für: ${downloadResult.fileName}`);

          return res.status(200).json({
            success: true,
            message: launchResult.message || 'Rhino/Grasshopper mit Server-Datei gestartet.',
            commandUsed: launchResult.commandUsed,
            processId: launchResult.processId,
            fileName: downloadResult.fileName,
            localFilePath: localFilePath,
            downloadTimeMs: downloadResult.downloadTimeMs,
            fileSizeBytes: downloadResult.fileSize,
            executionType: launchResult.executionType || 'unknown'
          });
        } else {
          this.logger.error(`/launch-rhino-with-download: Rhino-Start fehlgeschlagen: ${launchResult.message}`);
          return res.status(500).json({
            success: false,
            message: launchResult.message || 'Fehler beim Starten von Rhino/Grasshopper.'
          });
        }
      } catch (error) {
        this.logger.error(`/launch-rhino-with-download: Kritischer Fehler: ${error.message}`, error);
        return res.status(500).json({
          success: false,
          message: `Interner Serverfehler: ${error.message}`
        });
      }
    });

    this.logger.info('API-Routen konfiguriert (inkl. PHASE 2: Server-Download & Auto-Pairing).');
  }

  async start() {
    // SECURITY FIX: Await RhinoLauncher initialization before starting server
    // This prevents race condition where server accepts requests before RhinoLauncher is ready
    try {
      await this._initializeRhinoLauncher();
      this.logger.info('RhinoLauncher initialization completed before server start');
    } catch (error) {
      this.logger.error(`Failed to initialize RhinoLauncher: ${error.message}`);
      throw error; // Prevent server start if initialization fails
    }

    return new Promise((resolve, reject) => {
      this.server = this.app.listen(this.port, () => {
        this.logger.info(`Express-Server lauscht auf Port ${this.port}`);
        this._isRunning = true;
        resolve();
      }).on('error', (err) => {
        this.logger.error(`Fehler beim Starten des Express-Servers: ${err.message}`);
        this._isRunning = false;
        reject(err);
      });
    });
  }

  async stop() {
    return new Promise((resolve, reject) => {
      if (this.server) {
        this.server.close((err) => {
          if (err) {
            this.logger.error(`Fehler beim Stoppen des Express-Servers: ${err.message}`);
            this._isRunning = false; // Auch wenn Fehler, Server ist nicht mehr zuverlässig
            return reject(err);
          }
          this.logger.info('Express-Server gestoppt.');
          this._isRunning = false;
          resolve();
        });
      } else {
        this.logger.info('Express-Server war nicht gestartet, kein Stoppen notwendig.');
        this._isRunning = false;
        resolve();
      }
    });
  }

  getPort() {
    return this.port;
  }

  isRunning() {
    return this._isRunning;
  }
}

module.exports = AppServer;
