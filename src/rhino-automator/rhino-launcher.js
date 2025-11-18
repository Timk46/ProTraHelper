/**
 * RhinoLauncher - Erweiterte Klasse für direktes Starten von Rhino mit Grasshopper
 * PHASE 1: Python Script Integration - löst /runscript Probleme
 */
const { spawn } = require('node:child_process');
const fs = require('node:fs').promises;
const path = require('node:path');
const { RhinoCommandConfig } = require('./rhino-command-config');
const PythonScriptGenerator = require('./python-script-generator');
const RhinoCOMController = require('./rhino-com-controller');

class RhinoLauncher {
  constructor(logger) {
    this.logger = logger;
    this.activeProcesses = new Map(); // Track multiple processes by file path
    
    // PHASE 1: Python Script Generator Integration
    this.pythonGenerator = new PythonScriptGenerator(logger);
  }

  /**
   * Initialisiert den RhinoLauncher und alle Komponenten
   */
  async initialize() {
    try {
      await this.pythonGenerator.initialize();
      this.logger.info('RhinoLauncher initialized with Python Script support');
    } catch (error) {
      this.logger.error(`Failed to initialize RhinoLauncher: ${error.message}`);
      throw error;
    }
  }

  /**
   * SECURITY: Validates file path to prevent path traversal and malware execution
   * @param {string} filePath - File path to validate
   * @returns {string} - Validated absolute file path
   * @throws {Error} - If validation fails
   * @private
   */
  _validateFilePath(filePath) {
    // 1. Resolve to absolute path
    const resolved = path.resolve(filePath);

    // 2. Check extension whitelist (only .gh and .ghx)
    const ext = path.extname(resolved).toLowerCase();
    if (!['.gh', '.ghx'].includes(ext)) {
      throw new Error(`Invalid file extension: ${ext}. Only .gh and .ghx files allowed.`);
    }

    // 3. Verify file exists (synchronous check for launcher)
    const fs_sync = require('fs');
    if (!fs_sync.existsSync(resolved)) {
      throw new Error(`File not found: ${resolved}`);
    }

    // 4. Check file size (max 100MB)
    const stats = fs_sync.statSync(resolved);
    const maxSize = 100 * 1024 * 1024;
    if (stats.size > maxSize) {
      throw new Error(`File too large: ${stats.size} bytes (max: ${maxSize})`);
    }

    // 5. Verify it's a regular file
    if (!stats.isFile()) {
      throw new Error(`Not a regular file: ${resolved}`);
    }

    return resolved;
  }

  /**
   * Ermittelt die Befehlskonfiguration für eine Datei
   * @param {string} ghFilePath - Pfad zur .gh-Datei
   * @returns {Object} - Befehlskonfiguration {type, command, mode}
   */
  _getCommandConfig(ghFilePath) {
    try {
      // SECURITY FIX: Validate file path before processing
      const validatedPath = this._validateFilePath(ghFilePath);

      // Ermittle den passenden Befehl für diese Datei
      const command = RhinoCommandConfig.getCommandForFile(validatedPath);
      
      // Prüfe ob es ein COM-basierter Befehl ist (HÖCHSTE PRIORITÄT)
      if (command.startsWith('COM:')) {
        const mode = command.replace('COM:', '');
        return {
          type: 'com',
          command: command,
          mode: mode,
          fileName: path.basename(validatedPath)
        };
      }
      // Prüfe ob es ein Python-basierter Befehl ist
      else if (command.startsWith('PYTHON:')) {
        const mode = command.replace('PYTHON:', '');
        return {
          type: 'python',
          command: command,
          mode: mode,
          fileName: path.basename(validatedPath)
        };
      } else {
        // Legacy CLI-basierter Befehl
        return {
          type: 'cli',
          command: command,
          mode: 'legacy',
          fileName: path.basename(validatedPath)
        };
      }
      
    } catch (error) {
      this.logger.error(`Fehler beim Ermitteln der Befehlskonfiguration für ${ghFilePath}: ${error.message}`);
      // Fallback zu COM basic mode (beste Methode)
      return {
        type: 'com',
        command: 'COM:basic',
        mode: 'basic',
        fileName: path.basename(ghFilePath)
      };
    }
  }

  /**
   * Erstellt den datei-spezifischen Grasshopper-Befehl basierend auf der Konfiguration
   * @param {string} ghFilePath - Pfad zur .gh-Datei
   * @returns {string} - Der datei-spezifische Rhino-Befehl
   */
  _buildGrasshopperCommand(ghFilePath) {
    try {
      // Legacy-Methode für CLI-basierte Befehle
      const command = RhinoCommandConfig.getCommandForFile(ghFilePath);
      
      // Validiere den Befehl
      if (!RhinoCommandConfig.validateCommand(command)) {
        this.logger.warn(`Unsicherer Befehl erkannt für ${ghFilePath}, verwende Standard-Befehl`);
        return RhinoCommandConfig.getCommandForFile('*'); // Fallback zum Standard
      }
      
      // Escape Pfad für Windows-Kommandozeile falls nötig
      const escapedPath = ghFilePath.includes(' ') ? `"${ghFilePath}"` : ghFilePath;
      const finalCommand = command.replace(/\{filePath\}/g, escapedPath);
      
      this.logger.info(`Verwende CLI-Befehl für ${path.basename(ghFilePath)}: ${finalCommand}`);
      return finalCommand;
      
    } catch (error) {
      this.logger.error(`Fehler beim Ermitteln des Befehls für ${ghFilePath}: ${error.message}`);
      // Fallback zum ursprünglichen Standard-Befehl
      const escapedPath = ghFilePath.replace(/\\/g, '\\\\');
      return `_-Grasshopper _DocumentOpen "${escapedPath}" _Enter`;
    }
  }

  /**
   * Startet Rhino mit Python-Script Integration
   * @param {string} rhinoExecutablePath - Pfad zur Rhino.exe
   * @param {string} ghFilePath - Pfad zur .gh-Datei
   * @param {Object} commandConfig - Befehlskonfiguration
   * @returns {Promise<Object>} - Ergebnis mit success und message
   */
  async _launchRhinoWithPython(rhinoExecutablePath, ghFilePath, commandConfig) {
    try {
      this.logger.info(`Launching Rhino with Python script integration: ${commandConfig.mode} mode`);
      
      // Erstelle Python-Script
      const scriptPath = await this.pythonGenerator.createScriptFile(ghFilePath, commandConfig.mode);
      
      // Rhino-Argumente für Python-Script Ausführung
      const rhinoArgs = [
        '/nosplash',                    // Kein Splash-Screen
        `/runscript=_RunPythonScript "${scriptPath}"` // Python-Script ausführen
      ];

      this.logger.info(`Python script created: ${scriptPath}`);
      this.logger.info(`Starte Rhino mit Python: "${rhinoExecutablePath}" [${rhinoArgs.join(', ')}]`);

      // Starte Rhino-Prozess
      const rhinoProcess = spawn(rhinoExecutablePath, rhinoArgs, {
        detached: true,          // Prozess läuft unabhängig
        stdio: 'pipe',           // Capture output für Python-Script debugging
        windowsHide: false       // Rhino-Fenster sichtbar
      });

      // Prozess von Helfer-App entkoppeln
      rhinoProcess.unref();

      // Cleanup Script nach 60 Sekunden
      setTimeout(() => {
        this.pythonGenerator.cleanupScript(scriptPath);
      }, 60000);

      return {
        success: true,
        message: `Rhino mit Python-Script gestartet (${commandConfig.mode} Modus)`,
        processId: rhinoProcess.pid,
        fileName: commandConfig.fileName,
        commandUsed: `_RunPythonScript "${scriptPath}"`,
        scriptPath: scriptPath,
        pythonMode: commandConfig.mode,
        executionType: 'python'
      };

    } catch (error) {
      this.logger.error(`Fehler beim Python-basierten Rhino-Start: ${error.message}`);
      throw error;
    }
  }

  /**
   * Startet Rhino mit Legacy CLI-Befehlen
   * @param {string} rhinoExecutablePath - Pfad zur Rhino.exe
   * @param {string} ghFilePath - Pfad zur .gh-Datei
   * @param {Object} commandConfig - Befehlskonfiguration
   * @returns {Promise<Object>} - Ergebnis mit success und message
   */
  async _launchRhinoWithCLI(rhinoExecutablePath, ghFilePath, commandConfig) {
    try {
      this.logger.info(`Launching Rhino with legacy CLI commands`);
      
      // Erstelle CLI-Befehl
      const grasshopperCommand = this._buildGrasshopperCommand(ghFilePath);
      
      // Rhino-Argumente
      const rhinoArgs = [
        '/nosplash',                    // Kein Splash-Screen
        `/runscript=${grasshopperCommand}` // CLI-Befehl ausführen
      ];

      this.logger.info(`Starte Rhino mit CLI: "${rhinoExecutablePath}" [${rhinoArgs.join(', ')}]`);

      // Starte Rhino-Prozess
      const rhinoProcess = spawn(rhinoExecutablePath, rhinoArgs, {
        detached: true,          // Prozess läuft unabhängig
        stdio: 'ignore',         // Keine Pipes für CLI
        windowsHide: false       // Rhino-Fenster sichtbar
      });

      // Prozess von Helfer-App entkoppeln
      rhinoProcess.unref();

      return {
        success: true,
        message: `Rhino mit CLI-Befehlen gestartet`,
        processId: rhinoProcess.pid,
        fileName: commandConfig.fileName,
        commandUsed: grasshopperCommand,
        executionType: 'cli'
      };

    } catch (error) {
      this.logger.error(`Fehler beim CLI-basierten Rhino-Start: ${error.message}`);
      throw error;
    }
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
   * Startet Rhino mit COM Automation (löst /runscript Probleme)
   * @param {string} rhinoExecutablePath - Pfad zur Rhino.exe
   * @param {string} ghFilePath - Pfad zur .gh-Datei
   * @param {Object} commandConfig - Befehlskonfiguration
   * @returns {Promise<Object>} - Ergebnis mit success und message
   */
  async _launchRhinoWithCOM(rhinoExecutablePath, ghFilePath, commandConfig) {
    try {
      this.logger.info(`Launching Rhino with COM Automation: ${commandConfig.mode} mode`);
      
      // Phase 1: Starte Rhino OHNE /runscript (verhindert problematische Parameter)
      const rhinoArgs = ['/nosplash'];
      
      this.logger.info(`Starte Rhino (clean): "${rhinoExecutablePath}" [${rhinoArgs.join(', ')}]`);
      
      const rhinoProcess = spawn(rhinoExecutablePath, rhinoArgs, {
        detached: true,
        stdio: 'ignore',
        windowsHide: false
      });

      rhinoProcess.unref();

      // FIX #2: CRITICAL - Add initial delay before attempting COM connection
      // Rhino process starts immediately but COM server takes 5-15 seconds to initialize
      // Without this delay, all connection attempts fail during startup window
      // OPTIMIZED: Reduced from 15s to 10s for faster UX (COM retry logic handles slower systems)
      this.logger.info('COM: Waiting 10 seconds for Rhino COM server to initialize...');
      await new Promise(resolve => setTimeout(resolve, 10000));
      this.logger.info('COM: Initial delay completed, attempting COM connection...');

      // Phase 2: Warte bis Rhino für COM bereit ist
      const comController = new RhinoCOMController(this.logger);
      // FIX #7: Changed from maxWaitSeconds to maxAttempts (progressive timeout strategy)
      // 10 attempts with 30s/45s/60s timeouts = up to ~7.5 minutes total wait time
      const rhinoReady = await comController.waitForRhinoReady(10);

      if (!rhinoReady) {
        throw new Error('Rhino not ready for COM connection after 10 attempts');
      }
      
      // Phase 3: Verbinde via COM und führe Befehle aus
      const connected = await comController.connectToRhino();
      if (!connected) {
        throw new Error('Failed to connect to Rhino via COM');
      }
      
      // Phase 4: Führe modus-spezifische Befehle aus
      let loadResult, modeResult;
      
      if (commandConfig.mode === 'registry_sequence') {
        // Spezielle Registry-Sequenz mit B D W L W H D O Befehlen
        loadResult = await comController.executeRegistrySequence(ghFilePath);
        modeResult = loadResult; // Registry-Sequenz beinhaltet bereits alle Schritte
      } else {
        // Standard-Datei-Laden
        loadResult = await comController.loadGrasshopperFile(ghFilePath);
        if (!loadResult.success) {
          throw new Error(`Failed to load Grasshopper file: ${loadResult.message}`);
        }
        
        // Standard modus-spezifische Befehle
        modeResult = { success: true, message: 'Basic mode completed' };
        
        if (commandConfig.mode === 'with_viewport' || commandConfig.mode === 'viewport') {
          modeResult = await comController.executeViewportCommand('_MaxViewport');
        } else if (commandConfig.mode === 'presentation') {
          modeResult = await comController.activatePresentationMode();
        } else if (commandConfig.mode === 'technical') {
          await comController.executeViewportCommand('_MaxViewport');
          await comController.executeViewportCommand('_SetView _Top');
          await comController.executeViewportCommand('_SetDisplayMode _Wireframe');
          modeResult = await comController.executeViewportCommand('_ZoomExtents');
        }
      }
      
      // Cleanup COM-Verbindung
      await comController.cleanup();
      
      this.logger.info(`COM: Rhino successfully launched and configured`);
      
      return {
        success: true,
        message: `Rhino with Grasshopper launched via COM (${commandConfig.mode})`,
        processId: rhinoProcess.pid,
        fileName: commandConfig.fileName,
        commandUsed: `COM: loadGrasshopperFile + ${commandConfig.mode} mode`,
        documentName: loadResult.documentName,
        executionType: 'com',
        comResult: {
          grasshopperLoaded: loadResult.success,
          modeActivated: modeResult.success,
          modeMessage: modeResult.message
        }
      };
      
    } catch (error) {
      this.logger.error(`Fehler beim COM-basierten Rhino-Start: ${error.message}`);
      throw error;
    }
  }

  /**
   * Startet Rhino mit der spezifizierten Grasshopper-Datei
   * PHASE 2: COM Automation als Standard, Python/CLI als Fallback
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

      // PHASE 1: Ermittle Befehlskonfiguration (Python vs CLI)
      const commandConfig = this._getCommandConfig(ghFilePath);
      
      this.logger.info(`Command configuration for ${commandConfig.fileName}: ${commandConfig.type} (${commandConfig.mode})`);

      let result;

      // PHASE 2: Wähle Ausführungsmethode basierend auf Konfiguration
      if (commandConfig.type === 'com') {
        // COM Automation (PRIMÄR - löst /runscript Probleme definitiv)
        this.logger.info('Using COM Automation (primary method)...');
        result = await this._launchRhinoWithCOM(rhinoExecutablePath, ghFilePath, commandConfig);
      } else if (commandConfig.type === 'python') {
        // Python Script Integration (FALLBACK)
        this.logger.info('Using Python Script Integration...');
        result = await this._launchRhinoWithPython(rhinoExecutablePath, ghFilePath, commandConfig);
      } else {
        // Legacy CLI-basierte Befehle (FALLBACK)
        this.logger.info('Using Legacy CLI commands...');
        result = await this._launchRhinoWithCLI(rhinoExecutablePath, ghFilePath, commandConfig);
      }

      // Tracking für aktive Prozesse
      this.activeProcesses.set(processKey, {
        pid: result.processId,
        startTime: new Date(),
        ghFilePath: ghFilePath,
        commandConfig: commandConfig
      });

      // Cleanup nach 30 Sekunden (Prozess sollte dann gestartet sein)
      setTimeout(() => {
        this.activeProcesses.delete(processKey);
        this.logger.info(`Prozess-Tracking beendet für: ${ghFilePath}`);
      }, 30000);

      this.logger.info(`Rhino erfolgreich gestartet (PID: ${result.processId}) für Datei: ${ghFilePath}`);

      return result;

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
      fileName: path.basename(process.ghFilePath),
      commandConfig: process.commandConfig
    }));
  }

  /**
   * Cleanup-Methode zum Aufräumen von Prozess-Tracking und Python-Scripts
   */
  async cleanup() {
    this.activeProcesses.clear();
    
    // PHASE 1: Cleanup aller Python-Scripts
    if (this.pythonGenerator) {
      await this.pythonGenerator.cleanupAllScripts();
    }
    
    this.logger.info('RhinoLauncher cleanup completed');
  }
}

module.exports = RhinoLauncher;
