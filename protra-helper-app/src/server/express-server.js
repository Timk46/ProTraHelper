const express = require('express');
const cors = require('cors');
const path = require('node:path');
const fs = require('node:fs');
const RhinoLauncher = require('../rhino-automator/rhino-launcher');

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
    this.rhinoLauncher = new RhinoLauncher(this.logger);
    this._isRunning = false;

    if (!this.apiSecretToken) {
        this.logger.error('KRITISCH: Kein API Secret Token beim Initialisieren des AppServers bereitgestellt!');
        // In einem echten Szenario könnte hier ein Fehler geworfen oder die App beendet werden.
    }

    this._configureMiddleware();
    this._configureRoutes();
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
    // CORS-Konfiguration
    const corsOptions = {
      origin: (origin, callback) => {
        // Im Entwicklungsmodus localhost:4200 (Angular) und ggf. andere erlauben
        // Für Produktion sollte dies auf die spezifische Domain der ProTra-Webanwendung beschränkt werden.
        // const allowedOrigins = ['http://localhost:4200']; // TODO: Aus Konfiguration laden oder erweitern // Alte Zeile
        
        // Logik mit den übergebenen allowedOrigins
        if (process.env.NODE_ENV !== 'production') {
            // Erlaube alle Origins im Entwicklungsmodus, wenn keine explizite Origin gesendet wird (z.B. Postman)
            // oder wenn die Origin in der Whitelist ist.
            if (!origin || this.allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                this.logger.warn(`CORS: Blocked origin ${origin} (Entwicklungsmodus, nicht in Whitelist: ${this.allowedOrigins.join(', ')})`);
                callback(new Error('Not allowed by CORS'));
            }
        } else {
            if (this.allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                this.logger.warn(`CORS: Blocked origin ${origin} (Produktionsmodus, nicht in Whitelist: ${this.allowedOrigins.join(', ')})`);
                callback(new Error('Not allowed by CORS'));
            }
        }
      },
      methods: ['GET', 'POST'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Protra-Helper-Token', 'device-id'],
    };
    this.app.use(cors(corsOptions));
    this.logger.info('CORS-Middleware konfiguriert.');

    // JSON Body Parser
    this.app.use(express.json({ limit: '1mb' })); // Limit für Request-Body-Größe
    this.logger.info('JSON Body Parser Middleware konfiguriert.');

    // Einfache Request-Logging Middleware
    this.app.use((req, res, next) => {
      this.logger.info(`HTTP Request: ${req.method} ${req.originalUrl} (Origin: ${req.headers.origin || 'N/A'})`);
      next();
    });
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

    // POST /launch-rhino - Geschützt durch Authentifizierungs-Middleware
    this.app.post('/launch-rhino', authMiddleware, async (req, res) => {
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
            this.logger.info(`/launch-rhino erfolgreich für: ${ghFilePath}`);
            return res.status(200).json({ success: true, message: result.message || 'Rhino/Grasshopper gestartet.' });
        } else {
            this.logger.error(`/launch-rhino fehlgeschlagen für ${ghFilePath}: ${result.message}`);
            return res.status(500).json({ success: false, message: result.message || 'Fehler beim Starten von Rhino/Grasshopper.' });
        }
      } catch (error) {
        this.logger.error(`/launch-rhino: Kritischer Fehler beim Versuch, Rhino zu starten: ${error.message}`, error);
        return res.status(500).json({ success: false, message: `Interner Serverfehler: ${error.message}` });
      }
    });

    this.logger.info('API-Routen konfiguriert.');
  }

  async start() {
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
