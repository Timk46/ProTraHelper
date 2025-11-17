const { app, BrowserWindow, ipcMain, nativeTheme, Tray, Menu, shell, dialog } = require('electron');
const path = require('node:path');
const crypto = require('node:crypto');
const logger = require('./src/utils/logger'); // Wird später erstellt
const AppServer = require('./src/server/express-server'); // Wird später erstellt
const TrayManager = require('./src/tray-manager/tray'); // Wird später erstellt
const RhinoPathManager = require('./src/rhino-automator/rhino-path-manager'); // Wird später erstellt

let trayManager = null;
let expressServer = null;
let appMenu = null; // Hinzugefügt für das macOS App-Menü

// Globale Referenz auf das Hauptfenster-Objekt, um zu verhindern, dass es
// automatisch geschlossen wird, wenn JavaScript die Garbage Collection durchführt.
// Da wir primär eine Tray-Anwendung haben, ist ein sichtbares Hauptfenster nicht zwingend.
let mainWindow;

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
            await shell.openExternal('https:// Ihre-Protra-Webseite.de');
          }
        }
      ]
    }
  ];

  return Menu.buildFromTemplate(template);
}

// Diese Methode wird aufgerufen, wenn Electron mit der Initialisierung fertig ist
// und Browserfenster erstellen kann. Einige APIs können nur nach dem Auftreten dieses Events genutzt werden.
app.whenReady().then(async () => {
  logger.info('App ist bereit.');

  // macOS App-Menü erstellen und setzen
  if (process.platform === 'darwin') {
    appMenu = createAppMenu();
    Menu.setApplicationMenu(appMenu);
    logger.info('macOS Anwendungsmenü erstellt und gesetzt.');
  }

  // Initialisiere Rhino Path Manager
  // Muss früh initialisiert werden, da andere Module ggf. den Pfad benötigen.
  RhinoPathManager.initialize(logger, dialog, shell, app.getPath('userData'));
  const rhinoPath = await RhinoPathManager.getRhinoPath();
  logger.info(`Aktueller Rhino-Pfad: ${rhinoPath || 'Nicht konfiguriert'}`);

  const store = RhinoPathManager.store; // Greife auf den Store vom RhinoPathManager zu

  // API Secret Token generieren/laden
  let apiSecretToken = store.get('apiSecretToken');
  if (!apiSecretToken) {
    apiSecretToken = crypto.randomBytes(32).toString('hex');
    store.set('apiSecretToken', apiSecretToken);
    logger.info('Neues API Secret Token generiert und gespeichert.');
  } else {
    logger.info('API Secret Token aus Store geladen.');
  }
  // Das Token sollte idealerweise nicht komplett geloggt werden, aber für Debugging-Zwecke hier ein Hinweis.
  // logger.debug(`Verwendetes API Secret Token: ${apiSecretToken}`); // In Produktion auskommentieren oder entfernen

  // Lade Konfiguration für CORS allowedOrigins
  let allowedOrigins = store.get('corsAllowedOrigins', ['https://protra.bshefl2.bs.informatik.uni-siegen.de']);
  if (!Array.isArray(allowedOrigins) || allowedOrigins.length === 0) {
    allowedOrigins = ['https://protra.bshefl2.bs.informatik.uni-siegen.de']; // Fallback for production
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

  // Erstelle das Tray-Icon und Menü
  trayManager = new TrayManager(app, logger, shell, dialog, RhinoPathManager, expressServer);
  trayManager.createTray();
  logger.info('Tray-Manager initialisiert und Tray-Icon erstellt.');

  // createWindow(); // Nur wenn ein sichtbares Fenster benötigt wird

  app.on('activate', () => {
    // Unter macOS ist es üblich, ein Fenster in der App wiederherzustellen,
    // wenn das Dock-Icon angeklickt wird und keine anderen Fenster geöffnet sind.
    // Da wir eine Tray-App sind, ist dies ggf. nicht relevant.
    // if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });

  // Verhindere, dass die App standardmäßig beendet wird, wenn kein Fenster offen ist.
  // Dies ist typisch für Tray-Anwendungen.
  app.on('window-all-closed', (e) => {
     // Unter macOS ist es üblich, dass Anwendungen und ihre Menüleiste aktiv bleiben,
     // bis der Benutzer sie explizit mit Cmd + Q beendet.
     // Für eine reine Tray-Anwendung wollen wir das Standardverhalten (Beenden) verhindern.
    e.preventDefault();
    logger.info('Alle Fenster geschlossen, App läuft weiter im Tray.');
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