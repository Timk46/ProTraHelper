const Store = require('electron-store');
const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

// Diese Klasse wird als Singleton über das Modul-Caching von Node.js behandelt.
// initialize() sollte einmal aufgerufen werden.
class RhinoPathManager {
  constructor() {
    // Initialisierung der Abhängigkeiten erfolgt über initialize()
    this.logger = console; // Fallback-Logger
    this.dialog = null;
    this.shell = null;
    this.userDataPath = '.'; // Fallback
    this.store = null;
    this.configKey = 'rhino8Path';
    this.currentRhinoPath = null;
    this.isMac = process.platform === 'darwin';
    this.isWindows = process.platform === 'win32';
  }

  initialize(logger, dialog, shell, userDataPath) {
    this.logger = logger || this.logger;
    this.dialog = dialog;
    this.shell = shell;
    this.userDataPath = userDataPath;
    this.store = new Store({
        cwd: path.join(this.userDataPath, 'protra-helper-config'),
        name: 'settings'
    });
    this.logger.info(`RhinoPathManager initialisiert. Konfiguration wird gespeichert unter: ${path.join(this.userDataPath, 'protra-helper-config', 'settings.json')}`);
  }

  getCurrentPath() {
    return this.currentRhinoPath;
  }

  async getRhinoPath() {
    if (this.currentRhinoPath && fs.existsSync(this.currentRhinoPath)) {
      this.logger.info(`Verwende bereits validierten Rhino-Pfad: ${this.currentRhinoPath}`);
      return this.currentRhinoPath;
    }

    // 1. Versuche, aus dem Store zu laden
    const storedPath = this.store.get(this.configKey);
    if (storedPath && fs.existsSync(storedPath)) {
      this.logger.info(`Rhino-Pfad aus Store geladen und validiert: ${storedPath}`);
      this.currentRhinoPath = storedPath;
      return storedPath;
    }
    if (storedPath) {
        this.logger.warn(`Gespeicherter Rhino-Pfad (${storedPath}) ist nicht mehr gültig.`);
        this.store.delete(this.configKey); // Ungültigen Pfad entfernen
    }

    // 2. Versuche automatische Erkennung
    this.logger.info('Versuche automatische Erkennung des Rhino 8 Pfades...');
    const detectedPath = await this.autoDetectRhinoPath();
    if (detectedPath && fs.existsSync(detectedPath)) {
      this.logger.info(`Rhino-Pfad automatisch erkannt und validiert: ${detectedPath}`);
      await this.setRhinoPath(detectedPath); // Speichern für zukünftige Verwendung
      return detectedPath;
    }

    this.logger.warn('Rhino 8 Pfad konnte nicht automatisch ermittelt oder im Store gefunden werden.');
    this.currentRhinoPath = null;
    return null;
  }

  async setRhinoPath(newPath) {
    if (newPath && typeof newPath === 'string' && fs.existsSync(newPath)) {
      this.store.set(this.configKey, newPath);
      this.currentRhinoPath = newPath;
      this.logger.info(`Rhino-Pfad erfolgreich gesetzt und gespeichert: ${newPath}`);
      return true;
    } else {
      this.logger.error(`Versuch, ungültigen Rhino-Pfad zu setzen: ${newPath}`);
      return false;
    }
  }

  async autoDetectRhinoPath() {
    if (this.isWindows) {
      this.logger.info('Automatische Erkennung für Windows...');
      // a) Registry-Schlüssel (häufigster und zuverlässigster Weg)
      const registryPathsToTry = [
        'HKEY_LOCAL_MACHINE\\SOFTWARE\\McNeel\\Rhinoceros\\8.0\\Install',
        // Ggf. weitere Schlüssel für andere Versionen oder 32/64-Bit Varianten, falls nötig
      ];
      for (const regPath of registryPathsToTry) {
        try {
          // Der 'InstallPath' Wert enthält oft das Verzeichnis, nicht die .exe selbst.
          // Der Wertename kann variieren, oft 'InstallPath' oder 'Path'.
          // Hier nehmen wir an, dass der Wert "InstallPath" existiert und zum Rhino-Systemordner führt.
          // Die genaue Abfrage muss ggf. angepasst werden.
          const command = `reg query "${regPath}" /v InstallPath`;
          this.logger.info(`Prüfe Registry mit Befehl: ${command}`);
          const stdout = execSync(command).toString();
          const matches = stdout.match(/InstallPath\s+REG_SZ\s+(.*)/i);
          if (matches && matches[1]) {
            const rhinoDir = matches[1].trim();
            const rhinoExePath = path.join(rhinoDir, 'System', 'Rhino.exe');
            this.logger.info(`Potenzieller Pfad aus Registry (${regPath}): ${rhinoExePath}`);
            if (fs.existsSync(rhinoExePath)) {
              return rhinoExePath;
            }
          }
        } catch (error) {
          this.logger.warn(`Fehler beim Abfragen des Registry-Schlüssels ${regPath}: ${error.message.split('\n')[0]}`);
        }
      }

      // b) Standard-Installationspfade
      const standardPaths = [
        'C:\\Program Files\\Rhino 8\\System\\Rhino.exe',
        'C:\\Program Files (x86)\\Rhino 8\\System\\Rhino.exe',
        // Umgebungsvariablen könnten auch geprüft werden, falls Rhino welche setzt.
      ];
      for (const sp of standardPaths) {
        this.logger.info(`Prüfe Standardpfad: ${sp}`);
        if (fs.existsSync(sp)) {
          return sp;
        }
      }
    } else if (this.isMac) {
      this.logger.info('Automatische Erkennung für macOS...');
      const standardPaths = [
        '/Applications/Rhino 8.app/Contents/MacOS/Rhino',
        // Ggf. Pfad im Benutzerverzeichnis /Users/<user>/Applications/
      ];
      for (const sp of standardPaths) {
        this.logger.info(`Prüfe Standardpfad: ${sp}`);
        if (fs.existsSync(sp)) {
          return sp;
        }
      }
    } else if (process.platform === 'linux') {
      this.logger.info('Automatische Erkennung für Linux...');
      // Eine automatische Erkennung für Linux ist komplex, da es keine standardisierten
      // Installationspfade gibt, insbesondere wenn Rhino via Wine läuft.
      // Mögliche Ansätze (nicht implementiert):
      // 1. Suche nach gängigen Wine-Prefix-Strukturen (z.B. ~/.wine/drive_c/...)
      // 2. Suche nach bekannten Namen für Rhino-Launcher-Skripte oder .desktop-Dateien.
      // 3. Prüfe Umgebungsvariablen, die ein Nutzer gesetzt haben könnte.
      // Vorerst wird für Linux die manuelle Konfiguration über das Tray-Menü empfohlen.
      this.logger.warn('Automatische Rhino-Pfad-Erkennung für Linux ist derzeit nicht implementiert. Bitte konfigurieren Sie den Pfad manuell über das Tray-Menü.');
    } else {
      this.logger.warn('Automatische Erkennung für das aktuelle Betriebssystem nicht implementiert.');
    }
    return null;
  }

  // Methode, um den Nutzer zur Konfiguration aufzufordern (wird vom TrayManager verwendet)
  // Diese Logik ist bereits im TrayManager, kann aber hier zentralisiert werden, falls gewünscht.
  // async promptForRhinoPath() { ... }
}

// Exportiere eine einzelne Instanz (Singleton-Pattern)
module.exports = new RhinoPathManager(); 