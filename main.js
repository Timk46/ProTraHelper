const { app, BrowserWindow, ipcMain, nativeTheme, Tray, Menu, shell, dialog, safeStorage } = require('electron');
const path = require('node:path');
const crypto = require('node:crypto');
const logger = require('./src/utils/logger'); // Wird später erstellt
const AppServer = require('./src/server/express-server'); // Wird später erstellt
const TrayManager = require('./src/tray-manager/tray'); // Wird später erstellt
const RhinoPathManager = require('./src/rhino-automator/rhino-path-manager'); // Wird später erstellt
const MacOSSetup = require('./src/platform/macos-setup');

let trayManager = null;
let expressServer = null;
let appMenu = null; // Hinzugefügt fuer das macOS App-Menue
let setupWindow = null;

// Globale Referenz auf das Hauptfenster-Objekt, um zu verhindern, dass es
// automatisch geschlossen wird, wenn JavaScript die Garbage Collection durchfuehrt.
// Da wir primaer eine Tray-Anwendung haben, ist ein sichtbares Hauptfenster nicht zwingend.
let mainWindow;

// rhinogh:// Protokoll-Handler registrieren
if (process.defaultApp) {
  // Im Entwicklungsmodus: Pfad zum Script mit registrieren
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('rhinogh', process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient('rhinogh');
}

// Single-Instance Lock: Verhindert mehrere App-Instanzen
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  // Windows/Linux: URL kommt via second-instance Event
  app.on('second-instance', (event, commandLine) => {
    // Suche nach rhinogh:// URL in den Kommandozeilen-Argumenten
    const url = commandLine.find((arg) => arg.startsWith('rhinogh://'));
    if (url) {
      handleProtocolUrl(url);
    }
  });
}

// macOS: URL kommt via open-url Event (auch wenn App bereits laeuft)
// Hinweis: Muss auch im second-instance Handler behandelt werden (Electron Bug #20088)
app.on('open-url', (event, url) => {
  event.preventDefault();
  handleProtocolUrl(url);
});

// Windows Cold-Start: URL kommt via process.argv (App war nicht gestartet)
if (process.platform === 'win32') {
  const protocolUrl = process.argv.find((arg) => arg.startsWith('rhinogh://'));
  if (protocolUrl) {
    // Wird nach app.whenReady() verarbeitet, da Express-Server noch nicht laeuft
    app.whenReady().then(() => {
      // Polling: Warten bis Express-Server laeuft, dann Protocol-URL verarbeiten
      let attempts = 0;
      const maxAttempts = 20;
      const pollInterval = setInterval(() => {
        attempts++;
        if (expressServer && expressServer.isRunning()) {
          clearInterval(pollInterval);
          handleProtocolUrl(protocolUrl);
        } else if (attempts >= maxAttempts) {
          clearInterval(pollInterval);
          logger.error('Express-Server Timeout nach 10s - Protocol-URL nicht verarbeitet');
        }
      }, 500);
    });
  }
}

// Erlaubte Protokoll-Aktionen (Whitelist fuer Sicherheit)
const ALLOWED_PROTOCOL_ACTIONS = ['status', 'launch', 'open'];

/**
 * Verarbeitet rhinogh:// URLs und dispatcht an Express-Server-Routen
 * Format: rhinogh://action/param1/param2?key=value
 * @param {string} url - Die rhinogh:// URL
 */
function handleProtocolUrl(url) {
  logger.info(`Protokoll-URL empfangen: ${url}`);
  try {
    const parsed = new URL(url);
    const action = parsed.hostname;

    // SECURITY: Nur erlaubte Aktionen durchlassen
    if (!ALLOWED_PROTOCOL_ACTIONS.includes(action)) {
      logger.warn(`Protokoll-Aktion abgelehnt (nicht in Whitelist): ${action}`);
      return;
    }

    // SECURITY: Pfad validieren - keine Path-Traversal-Angriffe
    const urlPath = parsed.pathname;
    if (urlPath.includes('..') || urlPath.includes('%2e') || urlPath.includes('%2E')) {
      logger.warn(`Protokoll-Pfad abgelehnt (verdaechtige Zeichen): ${urlPath}`);
      return;
    }

    logger.info(`Protokoll-Aktion: ${action}, Pfad: ${urlPath}`);

    if (expressServer && expressServer.isRunning()) {
      const http = require('http');
      const serverPort = expressServer.getPort();
      const requestPath = `/${action}${urlPath}?${parsed.searchParams.toString()}`;

      // API-Token aus Store laden fuer authentifizierten Dispatch
      const apiToken = RhinoPathManager.store
        ? RhinoPathManager.store.get('apiSecretToken', '')
        : '';

      const req = http.request({
        hostname: '127.0.0.1',
        port: serverPort,
        path: requestPath,
        method: 'GET',
        headers: {
          'X-Protocol-Handler': 'true',
          'x-protra-helper-token': apiToken
        }
      }, (res) => {
        logger.info(`Protokoll-Dispatch Antwort: ${res.statusCode}`);
      });
      req.on('error', (err) => {
        logger.error(`Protokoll-Dispatch Fehler: ${err.message}`);
      });
      req.end();
    } else {
      logger.warn('Express-Server nicht verfuegbar fuer Protokoll-Dispatch.');
    }
  } catch (error) {
    logger.error(`Fehler beim Verarbeiten der Protokoll-URL: ${error.message}`);
  }
}

function createWindow() {
  // Erstellt das Browser-Fenster.
  // Für eine reine Tray-App könnte dies entfallen oder ein unsichtbares Fenster sein.
  // Für Debugging-Zwecke oder eine initiale Konfigurations-UI kann es nützlich sein.
  /*
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    show: false, // Startet minimiert oder versteckt
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false, // Wichtig für Sicherheit
      contextIsolation: true, // Wichtig für Sicherheit
    },
  });
  // und lädt die index.html der App.
  // mainWindow.loadFile('index.html'); // Falls wir eine UI haben
  // Öffne die Entwicklerwerkzeuge.
  // mainWindow.webContents.openDevTools();
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
  */
  logger.info('Electron-Hauptprozess initialisiert.');
}

// Funktion zum Erstellen des macOS App-Menüs
function createAppMenu() {
  if (process.platform !== 'darwin') {
    return null; // Kein spezielles App-Menü für andere Plattformen als macOS notwendig (Tray-Menü reicht)
  }

  const template = [
    {
      label: app.name,
      submenu: [
        { role: 'about', label: `Über ${app.name}` },
        { type: 'separator' },
        { role: 'services', label: 'Dienste' },
        { type: 'separator' },
        { role: 'hide', label: `${app.name} ausblenden` },
        { role: 'hideOthers', label: 'Andere ausblenden' },
        { role: 'unhide', label: 'Alle einblenden' },
        { type: 'separator' },
        { role: 'quit', label: `${app.name} beenden` }
      ]
    },
    {
      label: 'Bearbeiten',
      submenu: [
        { role: 'undo', label: 'Rückgängig' },
        { role: 'redo', label: 'Wiederherstellen' },
        { type: 'separator' },
        { role: 'cut', label: 'Ausschneiden' },
        { role: 'copy', label: 'Kopieren' },
        { role: 'paste', label: 'Einfügen' },
        { role: 'delete', label: 'Löschen' },
        { type: 'separator' },
        { role: 'selectAll', label: 'Alles auswählen' }
        // { role: 'pasteAndMatchStyle', label: 'Einfügen und Stil anpassen' }, // Standardmäßig nicht immer benötigt
      ]
    },
    {
      label: 'Ansicht',
      submenu: [
        // { role: 'reload', label: 'Neu laden' }, // Nur relevant, wenn ein Fenster aktiv ist
        // { role: 'forceReload', label: 'Neu laden erzwingen' },
        // { role: 'toggleDevTools', label: 'Entwicklerwerkzeuge umschalten' },
        // { type: 'separator' },
        { role: 'resetZoom', label: 'Originalgröße' },
        { role: 'zoomIn', label: 'Vergrößern' },
        { role: 'zoomOut', label: 'Verkleinern' },
        // { type: 'separator' },
        // { role: 'togglefullscreen', label: 'Vollbildmodus umschalten' }
      ]
    },
    {
      label: 'Fenster',
      submenu: [
        { role: 'minimize', label: 'Minimieren' },
        { role: 'zoom', label: 'Zoomen' },
        { type: 'separator' },
        { role: 'front', label: 'In den Vordergrund bringen' },
        { type: 'separator' },
        { role: 'window', label: 'Fenster' } // macOS spezifisch für das Window Menü
      ]
    },
    {
      role: 'help',
      label: 'Hilfe',
      submenu: [
        {
          label: 'Mehr erfahren (ProTra Webseite)', // Beispiel
          click: async () => {
            await shell.openExternal('https://protra.hefl.de');
          }
        }
      ]
    }
  ];

  return Menu.buildFromTemplate(template);
}

/**
 * Zeigt ein Setup-/Willkommensfenster beim ersten App-Start
 * @returns {Promise<void>} Resolved wenn das Fenster geschlossen wird
 */
async function showSetupWindow() {
  // Auf macOS: Dock-Icon temporaer einblenden, damit das Fenster sichtbar ist
  // app.dock.show() gibt ein Promise zurueck
  if (process.platform === 'darwin') {
    await app.dock.show();
  }

  setupWindow = new BrowserWindow({
    width: 520,
    height: 680,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    title: 'ProTra Helfer - Einrichtung',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const setupPath = path.join(__dirname, 'setup.html');
  setupWindow.loadFile(setupPath);

  // Warte bis das Fenster geschlossen wird, bevor wir zurueckkehren.
  // So wird setupCompleted erst gesetzt, wenn der User das Fenster tatsaechlich gesehen und geschlossen hat.
  return new Promise((resolve) => {
    setupWindow.on('closed', () => {
      setupWindow = null;
      if (process.platform === 'darwin') {
        app.dock.hide();
      }
      resolve();
    });
  });
}

// Diese Methode wird aufgerufen, wenn Electron mit der Initialisierung fertig ist
// und Browserfenster erstellen kann. Einige APIs koennen nur nach dem Auftreten dieses Events genutzt werden.
app.whenReady().then(async () => {
  logger.info('App ist bereit.');

  // macOS App-Menü erstellen und setzen
  if (process.platform === 'darwin') {
    appMenu = createAppMenu();
    Menu.setApplicationMenu(appMenu);
    logger.info('macOS Anwendungsmenü erstellt und gesetzt.');
  }

  // macOS: LaunchAgent fuer Auto-Start bei Login einrichten
  if (process.platform === 'darwin') {
    const macSetup = new MacOSSetup(logger);
    const appBundlePath = macSetup.getAppBundlePath();
    if (appBundlePath) {
      macSetup.ensureLaunchAgent(appBundlePath);
    }
  }

  // Initialisiere Rhino Path Manager
  // Muss früh initialisiert werden, da andere Module ggf. den Pfad benötigen.
  RhinoPathManager.initialize(logger, dialog, shell, app.getPath('userData'));
  const rhinoPath = await RhinoPathManager.getRhinoPath();
  logger.info(`Aktueller Rhino-Pfad: ${rhinoPath || 'Nicht konfiguriert'}`);

  const store = RhinoPathManager.store; // Greife auf den Store vom RhinoPathManager zu

  // SECURITY FIX: API Secret Token generieren/laden mit Electron safeStorage encryption
  let apiSecretToken;
  const encryptedToken = store.get('apiSecretTokenEncrypted');

  if (safeStorage.isEncryptionAvailable() && encryptedToken) {
    // Decrypt stored token
    try {
      apiSecretToken = safeStorage.decryptString(Buffer.from(encryptedToken, 'base64'));
      logger.info('API Secret Token aus verschlüsseltem Store geladen.');
    } catch (error) {
      logger.warn(`Failed to decrypt API token, generating new one: ${error.message}`);
      apiSecretToken = null;
    }
  } else {
    // Fallback: try plaintext store (migration from old version)
    apiSecretToken = store.get('apiSecretToken');
    if (apiSecretToken) {
      logger.info('API Secret Token aus unverschlüsseltem Store migriert.');
      // Migrate to encrypted storage
      if (safeStorage.isEncryptionAvailable()) {
        const encrypted = safeStorage.encryptString(apiSecretToken).toString('base64');
        store.set('apiSecretTokenEncrypted', encrypted);
        store.delete('apiSecretToken'); // Remove plaintext
        logger.info('API Secret Token zu verschlüsseltem Store migriert.');
      }
    }
  }

  if (!apiSecretToken) {
    apiSecretToken = crypto.randomBytes(32).toString('hex');
    if (safeStorage.isEncryptionAvailable()) {
      const encrypted = safeStorage.encryptString(apiSecretToken).toString('base64');
      store.set('apiSecretTokenEncrypted', encrypted);
    } else {
      store.set('apiSecretToken', apiSecretToken);
      logger.warn('safeStorage not available — API token stored in plaintext.');
    }
    logger.info('Neues API Secret Token generiert und gespeichert.');
  }

  // Lade Konfiguration für CORS allowedOrigins
  // SECURITY FIX: No hardcoded production URLs — configure via electron-store or HEFL_CORS_ORIGINS env var
  const envOrigins = process.env.HEFL_CORS_ORIGINS
    ? process.env.HEFL_CORS_ORIGINS.split(',').map(o => o.trim()).filter(Boolean)
    : [];
  let allowedOrigins = store.get('corsAllowedOrigins', envOrigins);
  if (!Array.isArray(allowedOrigins)) {
    allowedOrigins = envOrigins;
    store.set('corsAllowedOrigins', allowedOrigins);
  }
  logger.info(`CORS allowedOrigins geladen: ${allowedOrigins.join(', ')}`);

  // SECURITY FIX: Create session-specific temp directory to prevent path traversal attacks
  // Each app instance gets its own isolated temp directory for downloaded files
  const sessionId = crypto.randomBytes(16).toString('hex');
  const sessionTempDir = path.join(app.getPath('temp'), `protra-files-${sessionId}`);
  logger.info(`Session temp directory: ${sessionTempDir}`);
  logger.info(`Session ID: ${sessionId}`);

  // Initialisiere und starte den Express Server mit den geladenen allowedOrigins und dem API-Token
  expressServer = new AppServer(logger, RhinoPathManager, sessionTempDir, allowedOrigins, apiSecretToken);
  try {
    await expressServer.start();
    logger.info(`Express-Server gestartet auf Port ${expressServer.getPort()}`);
  } catch (error) {
    logger.error('Fehler beim Starten des Express-Servers:', error);
    // Hier könnte eine kritische Fehlermeldung an den Nutzer erfolgen oder die App beendet werden.
    // Fürs Erste loggen wir nur.
  }

  // Erstelle das Tray-Icon und Menue
  const onShowSetup = () => {
    if (setupWindow !== null) {
      setupWindow.focus();
      return;
    }
    showSetupWindow();
  };
  trayManager = new TrayManager(app, logger, shell, dialog, RhinoPathManager, expressServer, { onShowSetup });
  trayManager.createTray();
  logger.info('Tray-Manager initialisiert und Tray-Icon erstellt.');

  app.on('activate', () => {
    // Unter macOS ist es üblich, ein Fenster in der App wiederherzustellen,
    // wenn das Dock-Icon angeklickt wird und keine anderen Fenster geöffnet sind.
    // Da wir eine Tray-App sind, ist dies ggf. nicht relevant.
    // if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });

  // Verhindere, dass die App standardmäßig beendet wird, wenn kein Fenster offen ist.
  // Dies ist typisch für Tray-Anwendungen.
  app.on('window-all-closed', () => {
    // Tray-App: Nicht beenden wenn alle Fenster geschlossen werden.
    // Kein app.quit() aufrufen genuegt, preventDefault() ist hier ein no-op.
    logger.info('Alle Fenster geschlossen, App laeuft weiter im Tray.');
  });

  // SECURITY: Cleanup session temp directory on app quit
  app.on('before-quit', async () => {
    logger.info('App wird beendet, bereinige Session-Temp-Verzeichnis...');
    try {
      const fs = require('fs');
      if (fs.existsSync(sessionTempDir)) {
        fs.rmSync(sessionTempDir, { recursive: true, force: true });
        logger.info(`Session temp directory bereinigt: ${sessionTempDir}`);
      }
    } catch (error) {
      logger.warn(`Fehler beim Bereinigen des Temp-Verzeichnisses: ${error.message}`);
    }
  });

  // Setup-Fenster anzeigen wenn Version sich geaendert hat (oder Erststart)
  const currentVersion = app.getVersion();
  const setupCompletedVersion = store.get('setupCompletedVersion');
  if (setupCompletedVersion !== currentVersion) {
    logger.info(`Setup-Fenster wird angezeigt (Version: ${currentVersion}, zuletzt: ${setupCompletedVersion || 'nie'}).`);
    await showSetupWindow();
    store.set('setupCompletedVersion', currentVersion);
    logger.info('Setup abgeschlossen - setupCompletedVersion aktualisiert.');
  }

});

// Beendet die Anwendung, wenn alle Fenster geschlossen sind, außer unter macOS.
// Für eine reine Tray-Anwendung wird dies normalerweise durch das obige 'window-all-closed' überschrieben.
/*
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
*/

// IPC-Handler (Beispiele, falls Kommunikation mit einem Renderer-Prozess benötigt wird)
/*
ipcMain.handle('get-app-version', async () => {
  return app.getVersion();
});
*/

// Globale Fehlerbehandlung im Hauptprozess
process.on('uncaughtException', (error) => {
  logger.error('Unbehandelter Fehler im Hauptprozess:', error);
  // Hier könnte eine Benachrichtigung an den Nutzer erfolgen.
});

// Beim Beenden der App sicherstellen, dass Ressourcen freigegeben werden
app.on('will-quit', async () => {
  logger.info('App wird beendet...');
  if (expressServer) {
    await expressServer.stop();
    logger.info('Express-Server gestoppt.');
  }
  // TrayManager wird nicht explizit hier zerstört, da app.quit() das übernimmt bzw. Electron Handles freigibt.
  // if (trayManager) {
  //   trayManager.destroy();
  //   logger.info('Tray-Icon zerstört.');
  // }
  logger.info('Aufräumarbeiten abgeschlossen. Bye bye!');
});

logger.info('main.js geladen.'); 