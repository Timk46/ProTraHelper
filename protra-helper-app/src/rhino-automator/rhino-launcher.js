/**
 * RhinoLauncher - Erweiterte Klasse für direktes Starten von Rhino mit Grasshopper
 * MODERNISIERT: Python Script Integration als Primärmethode, COM eliminiert
 */
const { spawn } = require('node:child_process');
const fs = require('node:fs').promises;
const path = require('node:path');
const { RhinoCommandConfig } = require('./rhino-command-config');
const PythonScriptGenerator = require('./python-script-generator');
const RhinoCOMController = require('./rhino-com-controller');
const DelayedCommandSender = require('./delayed-command-sender');

class RhinoLauncher {
  constructor(logger) {
    this.logger = logger;
    this.activeProcesses = new Map(); // Track multiple processes by file path
    
    // PHASE 1: Python Script Generator Integration
    this.pythonGenerator = new PythonScriptGenerator(logger);
    
    // PHASE 2: Delayed Command Sender Integration (löst Timing-Probleme)
    this.delayedCommander = new DelayedCommandSender(logger);
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
   * Ermittelt die Befehlskonfiguration für eine Datei
   * @param {string} ghFilePath - Pfad zur .gh-Datei
   * @returns {Object} - Befehlskonfiguration {type, command, mode}
   */
  _getCommandConfig(ghFilePath) {
    try {
      // Ermittle den passenden Befehl für diese Datei
      const command = RhinoCommandConfig.getCommandForFile(ghFilePath);
      
      // NEUE PRIORITÄT: Python hat Vorrang vor COM
      if (command.startsWith('PYTHON:')) {
        const mode = command.replace('PYTHON:', '');
        return {
          type: 'python',
          command: command,
          mode: mode,
          fileName: path.basename(ghFilePath)
        };
      }
      // COM als Legacy-Fallback
      else if (command.startsWith('COM:')) {
        const mode = command.replace('COM:', '');
        return {
          type: 'com',
          command: command,
          mode: mode,
          fileName: path.basename(ghFilePath)
        };
      } else {
        // Legacy CLI-basierter Befehl
        return {
          type: 'cli',
          command: command,
          mode: 'legacy',
          fileName: path.basename(ghFilePath)
        };
      }
      
    } catch (error) {
      this.logger.error(`Fehler beim Ermitteln der Befehlskonfiguration für ${ghFilePath}: ${error.message}`);
      // Fallback zu Python als beste moderne Methode
      return {
        type: 'python',
        command: 'PYTHON:registry_sequence',
        mode: 'registry_sequence',
        fileName: path.basename(ghFilePath)
      };
    }
  }

  /**
   * Erstellt echte Rhino CLI-Befehle (keine Template-Namen)
   * @param {string} ghFilePath - Pfad zur .gh-Datei
   * @returns {string} - Der echte Rhino-CLI-Befehl
   */
  _buildGrasshopperCommand(ghFilePath) {
    try {
      this.logger.info(`⚙️ CLI: Building real Rhino command for ${path.basename(ghFilePath)}`);
      
      // Escape Pfad für Windows-Kommandozeile
      const escapedPath = ghFilePath.includes(' ') ? `"${ghFilePath}"` : ghFilePath;
      
      // ECHTE RHINO-BEFEHLE basierend auf Web-Recherche
      // Verwende direkte Rhino-Syntax mit Zeitverzögerungen
      const realCommand = `_-Grasshopper _DocumentOpen "${escapedPath}" _Enter _Pause 2 _MaxViewport _Enter`;
      
      this.logger.info(`⚙️ CLI: Real Rhino command: ${realCommand}`);
      return realCommand;
      
    } catch (error) {
      this.logger.error(`⚙️ CLI ERROR: ${error.message}`);
      // Fallback zu einfachstem funktionierenden Befehl
      const escapedPath = ghFilePath.includes(' ') ? `"${ghFilePath}"` : ghFilePath;
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
      this.logger.info(`🐍 Python: Launching Rhino with Python script integration: ${commandConfig.mode} mode`);
      
      // Erstelle Python-Script
      const scriptPath = await this.pythonGenerator.createScriptFile(ghFilePath, commandConfig.mode);
      
      // Rhino-Argumente für Python-Script Ausführung
      const rhinoArgs = [
        '/nosplash',                    // Kein Splash-Screen
        `/runscript=_RunPythonScript "${scriptPath}"` // Python-Script ausführen
      ];

      this.logger.info(`🐍 Python script created: ${scriptPath}`);
      this.logger.info(`🚀 Starting Rhino with Python: "${rhinoExecutablePath}" [${rhinoArgs.join(', ')}]`);

      // Starte Rhino-Prozess
      const rhinoProcess = spawn(rhinoExecutablePath, rhinoArgs, {
        detached: true,          // Prozess läuft unabhängig
        stdio: 'ignore',         // WICHTIG: 'ignore' damit Logs in Rhino's Konsole (F2) erscheinen, nicht im Node-Prozess
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
      this.logger.error(`🐍 Fehler beim Python-basierten Rhino-Start: ${error.message}`);
      throw error;
    }
  }

  /**
   * Startet Rhino im "Clean Launch" Modus (NEUER ALTERNATIVER ANSATZ)
   * LÖSUNGSANSATZ: Rhino startet nur mit /nosplash, User fügt Befehle manuell in Dialog ein
   * @param {string} rhinoExecutablePath - Pfad zur Rhino.exe
   * @param {string} ghFilePath - Pfad zur .gh-Datei
   * @param {Object} commandConfig - Befehlskonfiguration
   * @returns {Promise<Object>} - Ergebnis mit success und message
   */
  async _launchRhinoWithCLI(rhinoExecutablePath, ghFilePath, commandConfig) {
    try {
      this.logger.info(`⚙️ Clean Launch: Starting Rhino for manual command input`);
      
      // NEUER ANSATZ: Nur sauberer Rhino-Start, keine automatischen Befehle
      const rhinoArgs = ['/nosplash'];

      this.logger.info(`⚙️ Clean Launch: Starting Rhino: "${rhinoExecutablePath}" [${rhinoArgs.join(', ')}]`);

      // Starte Rhino-Prozess ohne automatische Befehle
      const rhinoProcess = spawn(rhinoExecutablePath, rhinoArgs, {
        detached: true,
        stdio: 'ignore',
        windowsHide: false
      });

      rhinoProcess.unref();
      
      this.logger.info(`⚙️ Clean Launch Success: Rhino started cleanly (PID: ${rhinoProcess.pid})`);

      // Erstelle die Befehlssequenz, die der User manuell eingeben soll
      const manualCommandSequence = `_-Grasshopper B D W L W H D O "${ghFilePath}" W H _MaxViewport _Enter`;

      return {
        success: true,
        message: `Rhino ist gestartet und bereit für Befehle`,
        processId: rhinoProcess.pid,
        fileName: commandConfig.fileName,
        commandUsed: manualCommandSequence,
        executionType: 'clean_launch',
        userInstruction: 'Fügen Sie die angezeigte Befehlssequenz in die Rhino-Befehlszeile ein',
        sequenceExplanation: {
          '_-Grasshopper': 'Startet Grasshopper im Skript-Modus',
          'B D W L': 'Batch mode, Display, Window, Load',
          'W H': 'Window Hide (minimiert Grasshopper)',
          'D O': 'Document Open (Dokument öffnen)',
          'file': 'Grasshopper-Datei',
          '_MaxViewport': 'Maximiert die Rhino-Ansicht',
          '_Enter': 'Bestätigung'
        }
      };

    } catch (error) {
      this.logger.error(`⚙️ Clean Launch ERROR: ${error.message}`);
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

    this.logger.info(`📄 Grasshopper-Datei validiert: ${ghFilePath} (${Math.round(stats.size / 1024)}KB)`);
  }

  /**
   * Startet Rhino mit COM Automation (Legacy-Fallback)
   * @param {string} rhinoExecutablePath - Pfad zur Rhino.exe
   * @param {string} ghFilePath - Pfad zur .gh-Datei
   * @param {Object} commandConfig - Befehlskonfiguration
   * @returns {Promise<Object>} - Ergebnis mit success und message
   */
  async _launchRhinoWithCOM(rhinoExecutablePath, ghFilePath, commandConfig) {
    try {
      this.logger.info(`🔧 COM: Launching Rhino with COM Automation (LEGACY): ${commandConfig.mode} mode`);
      
      // Phase 1: Starte Rhino OHNE /runscript (verhindert problematische Parameter)
      const rhinoArgs = ['/nosplash'];
      
      this.logger.info(`🔧 Starting Rhino (clean): "${rhinoExecutablePath}" [${rhinoArgs.join(', ')}]`);
      
      const rhinoProcess = spawn(rhinoExecutablePath, rhinoArgs, {
        detached: true,
        stdio: 'ignore',
        windowsHide: false
      });
      
      rhinoProcess.unref();
      
      // Phase 2: Warte bis Rhino für COM bereit ist
      const comController = new RhinoCOMController(this.logger);
      const rhinoReady = await comController.waitForRhinoReady(30);
      
      if (!rhinoReady) {
        throw new Error('Rhino not ready for COM connection after 30 seconds');
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
      
      this.logger.info(`🔧 COM: Rhino successfully launched and configured`);
      
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
      this.logger.error(`🔧 Fehler beim COM-basierten Rhino-Start: ${error.message}`);
      throw error;
    }
  }

  /**
   * Startet Rhino mit der spezifizierten Grasshopper-Datei
   * MODERNISIERT: Python Script als Standard, robuste Fallback-Chain
   * @param {string} rhinoExecutablePath - Pfad zur Rhino.exe
   * @param {string} ghFilePath - Pfad zur .gh-Datei
   * @returns {Promise<Object>} - Ergebnis mit success und message
   */
  async launchRhinoWithGrasshopper(rhinoExecutablePath, ghFilePath) {
    const processKey = `${rhinoExecutablePath}:${ghFilePath}`;
    const globalProcessKey = `global_rhino_launch`;
    
    // VERBESSERTE DUPLIKAT-ERKENNUNG
    // 1. Prüfe globale Launches (verhindert mehrfaches gleichzeitiges Starten)
    if (this.activeProcesses.has(globalProcessKey)) {
      const globalProcess = this.activeProcesses.get(globalProcessKey);
      const timeSinceStart = Date.now() - globalProcess.startTime.getTime();
      
      if (timeSinceStart < 10000) { // 10 Sekunden Sperre
        this.logger.warn(`Global Rhino launch already in progress (${Math.round(timeSinceStart/1000)}s ago). Blocking duplicate request.`);
        return {
          success: false,
          message: `Rhino wird bereits gestartet. Bitte warten Sie ${Math.round((10000 - timeSinceStart)/1000)} Sekunden.`
        };
      }
    }
    
    // 2. Prüfe spezifische Datei
    if (this.activeProcesses.has(processKey)) {
      const fileProcess = this.activeProcesses.get(processKey);
      const timeSinceStart = Date.now() - fileProcess.startTime.getTime();
      
      if (timeSinceStart < 30000) { // 30 Sekunden Sperre für gleiche Datei
        this.logger.warn(`Rhino-Prozess für Datei bereits aktiv: ${ghFilePath} (${Math.round(timeSinceStart/1000)}s ago)`);
        return {
          success: false,
          message: `Rhino läuft bereits mit dieser Datei. Bitte warten Sie ${Math.round((30000 - timeSinceStart)/1000)} Sekunden.`
        };
      }
    }

    // Setze globale Sperre
    this.activeProcesses.set(globalProcessKey, {
      startTime: new Date(),
      type: 'global_lock'
    });

    try {
      // Validiere Eingaben
      await this._validateGrasshopperFile(ghFilePath);
      await fs.access(rhinoExecutablePath);

      // PHASE 1: Ermittle Befehlskonfiguration (Python vs CLI)
      const commandConfig = this._getCommandConfig(ghFilePath);
      
      this.logger.info(`📋 Command configuration for ${commandConfig.fileName}: ${commandConfig.type} (${commandConfig.mode})`);

      // Python-first Strategie für Robustheit und intelligentes Warten
      this.logger.info('🚀 Starting Rhino with modern automation strategies (Python first)');
      
      const strategies = [
        'python_advanced',    // Python Scripts (diagnostic mode)
        'python_basic',       // Basis Python Scripts
        'command_line',       // CLI als Fallback
        'rhinoscript',        // .rvb Dateien (future implementation)
      ];
      
      let launchResult = null;
      let lastError = null;
      
      for (const strategy of strategies) {
        try {
          this.logger.info(`🔄 Attempting strategy: ${strategy}`);
          
          if (strategy === 'python_advanced') {
            launchResult = await this._launchRhinoWithPython(rhinoExecutablePath, ghFilePath, {
              ...commandConfig, 
              mode: 'registry_sequence_advanced'
            });
          } else if (strategy === 'python_basic') {
            launchResult = await this._launchRhinoWithPython(rhinoExecutablePath, ghFilePath, commandConfig);
          } else if (strategy === 'command_line') {
            launchResult = await this._launchRhinoWithCLI(rhinoExecutablePath, ghFilePath, commandConfig);
          } else {
            // Future strategies (rhinoscript, etc.)
            this.logger.info(`⏭️ Strategy ${strategy} not yet implemented, skipping...`);
            continue;
          }
          
          if (launchResult && launchResult.success) {
            this.logger.info(`✅ Strategy ${strategy} succeeded!`);
            launchResult.strategy = strategy;
            break;
          } else {
            this.logger.warn(`❌ Strategy ${strategy} failed: ${launchResult?.message || 'Unknown error'}`);
            lastError = launchResult?.message || 'Unknown error';
          }
          
        } catch (error) {
          this.logger.error(`💥 Strategy ${strategy} threw exception: ${error.message}`);
          lastError = error.message;
        }
      }
      
      // Fallback zu altem COM nur wenn alle modernen Strategien fehlschlagen
      if (!launchResult || !launchResult.success) {
        this.logger.warn('🆘 All modern strategies failed, attempting legacy COM as last resort...');
        try {
          launchResult = await this._launchRhinoWithCOM(rhinoExecutablePath, ghFilePath, commandConfig);
          if (launchResult && launchResult.success) {
            launchResult.strategy = 'com_legacy_fallback';
          }
        } catch (comError) {
          this.logger.error(`💀 Even COM legacy fallback failed: ${comError.message}`);
          launchResult = {
            success: false,
            message: `All strategies failed. Last error: ${lastError || comError.message}`,
            strategy: 'all_failed'
          };
        }
      }

      // Tracking für aktive Prozesse
      if (launchResult && launchResult.processId) {
        this.activeProcesses.set(processKey, {
          pid: launchResult.processId,
          startTime: new Date(),
          ghFilePath: ghFilePath,
          commandConfig: commandConfig
        });
      }

      // Cleanup globale Sperre nach 15 Sekunden
      setTimeout(() => {
        this.activeProcesses.delete(globalProcessKey);
        this.logger.info('🔓 Global launch lock released');
      }, 15000);

      // Cleanup Datei-spezifische Sperre nach 60 Sekunden
      setTimeout(() => {
        this.activeProcesses.delete(processKey);
        this.logger.info(`🧹 Prozess-Tracking beendet für: ${ghFilePath}`);
      }, 60000);

      if (launchResult && launchResult.success) {
        this.logger.info(`🎉 Rhino erfolgreich gestartet (PID: ${launchResult.processId}) für Datei: ${ghFilePath}`);
      }

      return launchResult;

    } catch (error) {
      this.logger.error(`💀 Fehler beim Starten von Rhino mit Grasshopper: ${error.message}`);
      
      // Cleanup bei Fehler
      this.activeProcesses.delete(processKey);
      this.activeProcesses.delete(globalProcessKey);
      
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
    
    // PHASE 2: Cleanup aller Delayed Commands
    if (this.delayedCommander) {
      await this.delayedCommander.cleanupAll();
    }
    
    this.logger.info('🧹 RhinoLauncher cleanup completed');
  }
}

module.exports = RhinoLauncher;
