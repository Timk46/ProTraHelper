const { Tray, Menu, nativeImage } = require('electron');
const path = require('node:path');
const fs = require('node:fs'); // fs hinzugefügt für Existenzprüfung

class TrayManager {
  constructor(app, logger, shell, dialog, rhinoPathManager, expressServer) {
    this.app = app;
    this.logger = logger;
    this.shell = shell;
    this.dialog = dialog;
    this.rhinoPathManager = rhinoPathManager;
    this.expressServer = expressServer; // Um z.B. den Server-Status anzuzeigen
    this.tray = null;
    this.isMac = process.platform === 'darwin';
    this.isWindows = process.platform === 'win32';

    // Einheitliche Icon-Namen, Erweiterung wird plattformspezifisch gehandhabt oder .png als Default
    this.iconNameNormal = 'rhino_tray';
    this.iconNameError = 'icon-error';
    this.iconFallbackName = 'icon-fallback.png'; // Fallback ist immer PNG

    this.currentIconPath = null; // Pfad des aktuell gesetzten Icons
  }

  _getIconPath(iconName) {
    let iconFile = `${iconName}.png`; // Standard ist .png
    if (this.isMac && iconName === this.iconNameNormal) {
      // Auf macOS Template-Icon verwenden (Electron erkennt 'Template'-Suffix automatisch)
      const templateName = `${iconName}Template.png`;
      let basePath = path.join(this.app.getAppPath(), 'assets');
      if (process.env.NODE_ENV !== 'production') {
        basePath = path.join(__dirname, '..', '..', 'assets');
      }
      if (fs.existsSync(path.join(basePath, templateName))) {
        iconFile = templateName;
      }
    } else if (this.isWindows) {
      // Unter Windows .ico bevorzugen, wenn vorhanden
      const icoPath = path.join(this.app.getAppPath(), 'assets', `${iconName}.ico`);
      const devIcoPath = path.join(__dirname, '..', '..', 'assets', `${iconName}.ico`);
      if (fs.existsSync(devIcoPath) && process.env.NODE_ENV !== 'production') {
        iconFile = `${iconName}.ico`;
      } else if (fs.existsSync(icoPath)) {
        iconFile = `${iconName}.ico`;
      }
    }

    let basePath = path.join(this.app.getAppPath(), 'assets');
    if (process.env.NODE_ENV !== 'production') {
      // Im Entwicklungsmodus ist __dirname relativ zum aktuellen File
      basePath = path.join(__dirname, '..', '..', 'assets');
    }
    return path.join(basePath, iconFile);
  }

  createTray() {
    const iconPath = this._getIconPath(this.iconNameNormal);
    this.currentIconPath = iconPath;
    this.logger.info(`Versuche Tray-Icon zu laden von: ${iconPath}`);

    let image;
    if (fs.existsSync(iconPath)) {
      image = nativeImage.createFromPath(iconPath);
    } else {
      this.logger.warn(`Standard-Tray-Icon nicht gefunden unter: ${iconPath}. Versuche Fallback.`);
      const fallbackPath = this._getIconPath(this.iconFallbackName.replace('.png', '')); // .png ist im Namen
      if (fs.existsSync(fallbackPath)) {
        image = nativeImage.createFromPath(fallbackPath);
        this.currentIconPath = fallbackPath;
      } else {
        this.logger.error(`Fallback-Tray-Icon auch nicht gefunden unter: ${fallbackPath}. Tray wird nicht erstellt.`);
        this.dialog.showErrorBox('ProTra Helfer - Icon nicht gefunden',
          'Das Tray-Icon konnte nicht gefunden werden. Bitte stellen Sie sicher, dass die App korrekt installiert ist.\n\nPfad: ' + iconPath);
        return;
      }
    }

    if (image.isEmpty()) {
      this.logger.error('Geladenes Tray-Icon ist leer. Tray wird nicht erstellt.');
      this.dialog.showErrorBox('ProTra Helfer - Icon-Fehler',
        'Das Tray-Icon konnte nicht geladen werden. Die App laeuft im Hintergrund, ist aber nicht in der Menuleiste sichtbar.');
      return;
    }

    if (this.isMac) {
      // macOS Tray Icons: 16x16 @1x / 32x32 @2x ist der Apple-Standard
      image = image.resize({ width: 16, height: 16 });
      // Template Image VOR Tray-Erstellung setzen (verhindert Icon-Flash)
      image.setTemplateImage(true);
    }

    this.tray = new Tray(image);
    if (this.isMac) {
        this.tray.setIgnoreDoubleClickEvents(true);
    }

    this.updateContextMenu();
    this.tray.setToolTip('ProTra Helferanwendung');

    this.logger.info('Tray-Icon erfolgreich erstellt.');
  }

  updateContextMenu() {
    if (!this.tray || this.tray.isDestroyed()) return;

    const contextMenu = Menu.buildFromTemplate([
      {
        label: `ProTra Helfer: ${this.expressServer && this.expressServer.isRunning() ? 'Läuft' : 'Gestoppt'}`,
        enabled: false,
      },
      {
        label: `Rhino-Pfad: ${this.rhinoPathManager.getCurrentPath() || 'Nicht konfiguriert'}`,
        enabled: false
      },
      { type: 'separator' },
      {
        label: 'API Token anzeigen',
        click: () => {
          const store = this.rhinoPathManager.store;
          const apiToken = store.get('apiSecretToken', 'Nicht verfügbar');
          this.dialog.showMessageBox({
            type: 'info',
            title: 'ProTra Helper API Token',
            message: 'Kopieren Sie dieses Token in die Angular-Webanwendung:',
            detail: apiToken,
            buttons: ['OK', 'In Zwischenablage kopieren'],
            defaultId: 1
          }).then((result) => {
            if (result.response === 1) {
              require('electron').clipboard.writeText(apiToken);
              this.logger.info('API Token in Zwischenablage kopiert.');
            }
          });
        },
      },
      {
        label: 'Logs öffnen',
        click: () => {
          const logFilePath = this.logger.transports.file.getFile().path;
          this.shell.showItemInFolder(logFilePath);
          this.logger.info('Öffne Log-Datei im Explorer/Finder.');
        },
      },
      {
        label: 'Rhino 8 Pfad konfigurieren...',
        click: async () => {
          this.logger.info('Dialog zur Rhino-Pfad-Konfiguration angefordert.');
          const result = await this.dialog.showOpenDialog({
            title: 'Rhino 8 Installation auswählen',
            properties: ['openFile'], // Unter Linux 'openDirectory' falls man den Ordner der Exe will
            message: 'Bitte wählen Sie die Rhino.exe (Windows), die Rhino8-App (macOS) oder die Rhino-Executable (Linux)',
            filters: this.isMac 
                ? [{ name: 'Anwendung', extensions: ['app'] }]
                : (this.isWindows
                    ? [{ name: 'Programm', extensions: ['exe'] }]
                    : [] // Keine spezifischen Filter für Linux, Nutzer wählt die Executable
                ),
          });

          if (!result.canceled && result.filePaths.length > 0) {
            let selectedPath = result.filePaths[0];
            if (this.isMac && selectedPath.endsWith('.app')) {
                selectedPath = path.join(selectedPath, 'Contents', 'MacOS', 'Rhino');
            }
            this.logger.info(`Neuer Rhino-Pfad ausgewählt: ${selectedPath}`);
            await this.rhinoPathManager.setRhinoPath(selectedPath);
            this.updateContextMenu();
          } else {
            this.logger.info('Rhino-Pfad-Auswahl abgebrochen.');
          }
        },
      },
      { type: 'separator' },
      {
        label: 'Beenden',
        click: () => {
          this.logger.info('Anwendung wird über Tray-Menü beendet.');
          this.app.quit();
        },
      },
    ]);
    this.tray.setContextMenu(contextMenu);
  }

  setStatus(isError) {
    if (!this.tray || this.tray.isDestroyed()) return;

    const iconToSet = isError ? this.iconNameError : this.iconNameNormal;
    const newIconPath = this._getIconPath(iconToSet);

    if (this.currentIconPath !== newIconPath) {
      if (fs.existsSync(newIconPath)) {
        try {
          let image = nativeImage.createFromPath(newIconPath);
          if (image.isEmpty()) {
              this.logger.warn(`Konnte Tray-Icon für Status (${isError ? 'Error' : 'Normal'}) nicht laden (leer): ${newIconPath}`);
              return;
          }
          if (this.isMac) {
              image = image.resize({ width: 16, height: 16 });
              image.setTemplateImage(true);
          }
          this.tray.setImage(image);
          this.currentIconPath = newIconPath;
          this.logger.info(`Tray-Icon aktualisiert auf: ${iconToSet} (${newIconPath})`);
        } catch (error) {
          this.logger.error('Fehler beim Aktualisieren des Tray-Icons:', error);
        }
      } else {
        this.logger.warn(`Icon-Datei für Status nicht gefunden: ${newIconPath}`);
      }
    }
    this.updateContextMenu(); 
  }

  destroy() {
    if (this.tray && !this.tray.isDestroyed()) {
      this.tray.destroy();
      this.logger.info('Tray-Icon zerstört.');
    }
  }
}

module.exports = TrayManager;
