/**
 * RhinoLauncher - Optimierte Klasse für direktes Starten von Rhino mit Grasshopper
 * Verwendet die bewährten Grasshopper-Befehle ohne Python-Skript-Umweg
 */
const { spawn } = require('node:child_process');
const fs = require('node:fs').promises;
const path = require('node:path');

class RhinoLauncher {
  constructor(logger) {
    this.logger = logger;
    this.activeProcesses = new Map(); // Track multiple processes by file path
  }

  /**
   * Erstellt den optimierten Grasshopper-Befehl basierend auf Ihrer ursprünglichen Registry-Lösung
   * @param {string} ghFilePath - Pfad zur .gh-Datei
   * @returns {string} - Der Grasshopper-Befehl
   */
  _buildGrasshopperCommand(ghFilePath) {
    // Escape Pfad für Windows-Kommandozeile
    const escapedPath = ghFilePath.replace(/\\/g, '\\\\');
    
    // Optimierter Befehl basierend auf Ihrer Registry-Lösung:
    // B D W L = Batch mode, Display, Window, Load
    // W H = Window Hide (minimiert Grasshopper)
    // D O = Document Open
    // _MaxViewport = Maximiert die Rhino-Ansicht
    return `_-Grasshopper B D W L W H D O "${escapedPath}" W H _MaxViewport _Enter`;
  }

  /**
   * Validiert die .gh-Datei
   * @param {string} ghFilePath - Pfad zur .gh-Datei
   * @throws {Error} - Wenn Datei ungültig ist
   */
  async _validateGrasshopperFile(ghFilePath) {
    // Prüfe Dateiendung
    const validExtensions = ['.gh', '.ghx'];
    const fileExtension = path.extname(ghFilePath).toLowerCase();
    
    if (!validExtensions.includes(fileExtension)) {
      throw new Error(`Ungültige Dateiendung. Erwartet: ${validExtensions.join(', ')}, erhalten: ${fileExtension}`);
    }

    // Prüfe ob Datei existiert
    try {
      await fs.access(ghFilePath);
    } catch (error) {
      throw new Error(`Grasshopper-Datei nicht gefunden: ${ghFilePath}`);
    }

    // Optionale Dateigröße-Prüfung (verhindert extrem große Dateien)
    const stats = await fs.stat(ghFilePath);
    const maxSizeBytes = 100 * 1024 * 1024; // 100 MB Limit
    if (stats.size > maxSizeBytes) {
      throw new Error(`Datei zu groß (${Math.round(stats.size / 1024 / 1024)}MB). Maximum: ${Math.round(maxSizeBytes / 1024 / 1024)}MB`);
    }

    this.logger.info(`Grasshopper-Datei validiert: ${ghFilePath} (${Math.round(stats.size / 1024)}KB)`);
  }

  /**
   * Startet Rhino mit der spezifizierten Grasshopper-Datei
   * @param {string} rhinoExecutablePath - Pfad zur Rhino.exe
   * @param {string} ghFilePath - Pfad zur .gh-Datei
   * @returns {Promise<Object>} - Ergebnis mit success und message
   */
  async launchRhinoWithGrasshopper(rhinoExecutablePath, ghFilePath) {
    const processKey = `${rhinoExecutablePath}:${ghFilePath}`;
    
    // Prüfe ob bereits ein Prozess für diese Datei läuft
    if (this.activeProcesses.has(processKey)) {
      this.logger.warn(`Rhino-Prozess für Datei bereits aktiv: ${ghFilePath}`);
      return {
        success: false,
        message: 'Rhino läuft bereits mit dieser Datei. Bitte warten Sie, bis der vorherige Prozess beendet ist.'
      };
    }

    try {
      // Validiere Eingaben
      await this._validateGrasshopperFile(ghFilePath);
      await fs.access(rhinoExecutablePath);

      // Erstelle Grasshopper-Befehl
      const grasshopperCommand = this._buildGrasshopperCommand(ghFilePath);
      
      // Rhino-Argumente
      const rhinoArgs = [
        '/nosplash',                    // Kein Splash-Screen
        `/runscript=${grasshopperCommand}` // Grasshopper-Befehl ausführen
      ];

      this.logger.info(`Starte Rhino: "${rhinoExecutablePath}" mit Argumenten: [${rhinoArgs.join(', ')}]`);
      this.logger.info(`Grasshopper-Befehl: ${grasshopperCommand}`);

      // Starte Rhino-Prozess
      const rhinoProcess = spawn(rhinoExecutablePath, rhinoArgs, {
        detached: true,          // Prozess läuft unabhängig
        stdio: 'ignore',         // Keine Pipes (für bessere Performance)
        windowsHide: false       // Rhino-Fenster sichtbar
      });

      // Prozess von Helfer-App entkoppeln
      rhinoProcess.unref();

      // Tracking für aktive Prozesse
      this.activeProcesses.set(processKey, {
        pid: rhinoProcess.pid,
        startTime: new Date(),
        ghFilePath: ghFilePath
      });

      // Cleanup nach 30 Sekunden (Prozess sollte dann gestartet sein)
      setTimeout(() => {
        this.activeProcesses.delete(processKey);
        this.logger.info(`Prozess-Tracking beendet für: ${ghFilePath}`);
      }, 30000);

      // Event-Handler für Prozess
      rhinoProcess.on('error', (error) => {
        this.logger.error(`Fehler beim Starten von Rhino: ${error.message}`);
        this.activeProcesses.delete(processKey);
      });

      this.logger.info(`Rhino erfolgreich gestartet (PID: ${rhinoProcess.pid}) für Datei: ${ghFilePath}`);

      return {
        success: true,
        message: `Rhino wird gestartet und öffnet ${path.basename(ghFilePath)}. Das Grasshopper-Fenster wird automatisch minimiert.`,
        processId: rhinoProcess.pid,
        fileName: path.basename(ghFilePath)
      };

    } catch (error) {
      this.logger.error(`Fehler beim Starten von Rhino mit Grasshopper: ${error.message}`);
      this.activeProcesses.delete(processKey);
      
      return {
        success: false,
        message: `Fehler beim Starten von Rhino: ${error.message}`
      };
    }
  }

  /**
   * Gibt Information über aktive Rhino-Prozesse zurück
   * @returns {Array} - Liste der aktiven Prozesse
   */
  getActiveProcesses() {
    return Array.from(this.activeProcesses.entries()).map(([key, process]) => ({
      key,
      pid: process.pid,
      startTime: process.startTime,
      filePath: process.ghFilePath,
      fileName: path.basename(process.ghFilePath)
    }));
  }

  /**
   * Cleanup-Methode zum Aufräumen von Prozess-Tracking
   */
  cleanup() {
    this.activeProcesses.clear();
    this.logger.info('RhinoLauncher cleanup completed');
  }
}

module.exports = RhinoLauncher;
