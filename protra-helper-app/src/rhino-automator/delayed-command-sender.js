/**
 * DelayedCommandSender - Sendet Befehle an Rhino nach einer Zeitverzögerung
 * 
 * Diese Klasse löst das Problem, dass Rhino Zeit braucht um vollständig zu starten
 * bevor Grasshopper-Befehle verarbeitet werden können.
 */

const { spawn } = require('node:child_process');
const fs = require('node:fs').promises;
const path = require('node:path');

class DelayedCommandSender {
  constructor(logger) {
    this.logger = logger;
    this.activeDelayedCommands = new Map();
  }

  /**
   * Sendet Befehle an ein laufendes Rhino-Prozess nach einer Verzögerung
   * @param {number} rhinoPid - Process ID des Rhino-Prozesses
   * @param {string} ghFilePath - Pfad zur .gh-Datei
   * @param {number} delaySeconds - Verzögerung in Sekunden
   */
  async sendDelayedCommands(rhinoPid, ghFilePath, delaySeconds = 5) {
    try {
      this.logger.info(`⏰ Delayed Commands: Scheduling commands for PID ${rhinoPid} in ${delaySeconds} seconds`);
      
      const commandKey = `${rhinoPid}_${Date.now()}`;
      
      // Erstelle temporäre RhinoScript-Datei mit Befehlen
      const scriptContent = this._generateRhinoScript(ghFilePath);
      const scriptPath = await this._writeRhinoScript(scriptContent, commandKey);
      
      // Verzögerung vor Befehlsausführung
      setTimeout(async () => {
        try {
          await this._executeDelayedScript(rhinoPid, scriptPath, commandKey);
        } catch (error) {
          this.logger.error(`⏰ Delayed Commands ERROR: ${error.message}`);
        }
      }, delaySeconds * 1000);
      
      return {
        success: true,
        commandKey: commandKey,
        scriptPath: scriptPath,
        delaySeconds: delaySeconds
      };
      
    } catch (error) {
      this.logger.error(`⏰ Delayed Commands Setup ERROR: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generiert RhinoScript-Code für Grasshopper-Automatisierung
   * @param {string} ghFilePath - Pfad zur .gh-Datei
   * @returns {string} - RhinoScript-Code
   */
  _generateRhinoScript(ghFilePath) {
    const escapedPath = ghFilePath.replace(/\\/g, '\\\\');
    
    return `
' ProTra Delayed Rhino Automation Script
' Automatisiert Grasshopper-Start mit zeitverzögerten Befehlen

Option Explicit

Sub Main()
    Call Rhino.Print("ProTra: Starting delayed Grasshopper automation...")
    
    ' Phase 1: Starte Grasshopper
    Call Rhino.Print("ProTra: Phase 1 - Starting Grasshopper")
    Call Rhino.Command("_-Grasshopper", vbFalse)
    Call Rhino.Sleep(3000)
    
    ' Phase 2: Warte bis Grasshopper bereit ist
    Call Rhino.Print("ProTra: Phase 2 - Waiting for Grasshopper to be ready")
    Call WaitForGrasshopper()
    
    ' Phase 3: Lade Grasshopper-Datei
    Call Rhino.Print("ProTra: Phase 3 - Loading Grasshopper file")
    Call LoadGrasshopperFile("${escapedPath}")
    
    ' Phase 4: Aktiviere Präsentationsmodus
    Call Rhino.Print("ProTra: Phase 4 - Setting up presentation mode")
    Call SetupPresentationMode()
    
    Call Rhino.Print("ProTra: Delayed automation completed successfully")
End Sub

Sub WaitForGrasshopper()
    Dim i
    For i = 1 To 10
        Call Rhino.Sleep(1000)
        Call Rhino.Print("ProTra: Waiting for Grasshopper... (" & i & "/10)")
        ' Prüfe ob Grasshopper verfügbar ist (vereinfacht)
        If i > 3 Then Exit For
    Next
End Sub

Sub LoadGrasshopperFile(filePath)
    On Error Resume Next
    
    ' Versuche verschiedene Methoden zum Laden der Datei
    Call Rhino.Command("_DocumentOpen " & Chr(34) & filePath & Chr(34), vbFalse)
    Call Rhino.Sleep(2000)
    
    Call Rhino.Command("_Enter", vbFalse)
    Call Rhino.Sleep(1000)
    
    Call Rhino.Print("ProTra: File load attempted: " & filePath)
End Sub

Sub SetupPresentationMode()
    On Error Resume Next
    
    ' Maximiere Viewport
    Call Rhino.Command("_MaxViewport", vbFalse)
    Call Rhino.Sleep(500)
    
    ' Setze Perspektive-Ansicht
    Call Rhino.Command("_SetView _Perspective", vbFalse)
    Call Rhino.Sleep(500)
    
    ' Zoome auf Extents
    Call Rhino.Command("_ZoomExtents", vbFalse)
    Call Rhino.Sleep(500)
    
    Call Rhino.Print("ProTra: Presentation mode setup completed")
End Sub

' Führe Hauptfunktion aus
Call Main()
`;
  }

  /**
   * Schreibt RhinoScript in temporäre Datei
   * @param {string} scriptContent - RhinoScript-Inhalt
   * @param {string} commandKey - Eindeutiger Schlüssel
   * @returns {Promise<string>} - Pfad zur Script-Datei
   */
  async _writeRhinoScript(scriptContent, commandKey) {
    try {
      const tempDir = require('os').tmpdir();
      const scriptPath = path.join(tempDir, `protra_delayed_${commandKey}.rvb`);
      
      await fs.writeFile(scriptPath, scriptContent, 'utf8');
      
      this.activeDelayedCommands.set(commandKey, {
        scriptPath: scriptPath,
        createdAt: new Date()
      });
      
      this.logger.info(`⏰ RhinoScript written: ${scriptPath}`);
      return scriptPath;
      
    } catch (error) {
      this.logger.error(`⏰ RhinoScript write error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Führt das verzögerte Script aus
   * @param {number} rhinoPid - Rhino Process ID
   * @param {string} scriptPath - Pfad zum Script
   * @param {string} commandKey - Command Key
   */
  async _executeDelayedScript(rhinoPid, scriptPath, commandKey) {
    try {
      this.logger.info(`⏰ Executing delayed script for PID ${rhinoPid}: ${scriptPath}`);
      
      // Prüfe ob Rhino-Prozess noch läuft
      if (!await this._isProcessRunning(rhinoPid)) {
        this.logger.warn(`⏰ Rhino process ${rhinoPid} not running, skipping delayed commands`);
        return;
      }
      
      // Führe RhinoScript über RunScript aus
      const rhinoArgs = [
        `/runscript=_-LoadScript "${scriptPath}"`
      ];
      
      // Neue Rhino-Instanz um Script zu laden (verbindet sich mit laufender Instanz)
      const scriptProcess = spawn('C:\\Program Files\\Rhino 8\\System\\Rhino.exe', rhinoArgs, {
        detached: true,
        stdio: 'ignore',
        windowsHide: true
      });
      
      scriptProcess.unref();
      
      this.logger.info(`⏰ Delayed script execution initiated for PID ${rhinoPid}`);
      
      // Cleanup nach 30 Sekunden
      setTimeout(() => {
        this._cleanupDelayedCommand(commandKey);
      }, 30000);
      
    } catch (error) {
      this.logger.error(`⏰ Delayed script execution error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Prüft ob ein Prozess noch läuft
   * @param {number} pid - Process ID
   * @returns {Promise<boolean>} - True wenn Prozess läuft
   */
  async _isProcessRunning(pid) {
    try {
      const { execSync } = require('child_process');
      const result = execSync(`tasklist /FI "PID eq ${pid}"`, { encoding: 'utf8' });
      return result.includes(pid.toString());
    } catch (error) {
      return false;
    }
  }

  /**
   * Bereinigt verzögerte Befehle
   * @param {string} commandKey - Command Key
   */
  async _cleanupDelayedCommand(commandKey) {
    try {
      const commandInfo = this.activeDelayedCommands.get(commandKey);
      if (commandInfo) {
        await fs.unlink(commandInfo.scriptPath);
        this.activeDelayedCommands.delete(commandKey);
        this.logger.info(`⏰ Cleaned up delayed command: ${commandKey}`);
      }
    } catch (error) {
      this.logger.warn(`⏰ Cleanup warning: ${error.message}`);
    }
  }

  /**
   * Bereinigt alle aktiven verzögerten Befehle
   */
  async cleanupAll() {
    const promises = Array.from(this.activeDelayedCommands.keys()).map(key => 
      this._cleanupDelayedCommand(key)
    );
    
    await Promise.allSettled(promises);
    this.logger.info('⏰ All delayed commands cleaned up');
  }
}

module.exports = DelayedCommandSender;
