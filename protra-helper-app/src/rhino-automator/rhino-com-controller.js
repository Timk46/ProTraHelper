/**
 * RhinoCOMController - COM Automation für zuverlässige Rhino-Steuerung
 * 
 * Löst /runscript Probleme durch direkte COM-Interface Kommunikation
 * Ersetzt unzuverlässige Command-Line Parameter
 */

class RhinoCOMController {
  constructor(logger) {
    this.logger = logger;
    this.rhinoApp = null;
    this.connected = false;
    this.connectionAttempts = 0;
    this.maxConnectionAttempts = 10;
  }

  /**
   * Wartet bis Rhino via COM verfügbar ist
   * @param {number} maxWaitSeconds - Maximale Wartezeit in Sekunden
   * @returns {Promise<boolean>} - True wenn Rhino bereit ist
   */
  async waitForRhinoReady(maxWaitSeconds = 30) {
    this.logger.info('COM: Waiting for Rhino to be ready for COM connection...');
    
    for (let attempt = 1; attempt <= maxWaitSeconds; attempt++) {
      try {
        // Verwende spawn statt execSync für bessere Timeout-Kontrolle
        const { spawn } = require('child_process');
        
        const isReady = await new Promise((resolve) => {
          const timeout = setTimeout(() => {
            resolve(false);
          }, 2000); // Kürzerer Timeout pro Versuch
          
          const ps = spawn('powershell', [
            '-Command', 
            'try { $rhino = New-Object -ComObject "Rhino.Application"; if ($rhino.Visible -ne $null) { Write-Output "READY" } else { Write-Output "NOT_READY" } } catch { Write-Output "NOT_READY" }'
          ], { 
            stdio: 'pipe',
            windowsHide: true 
          });
          
          let output = '';
          ps.stdout.on('data', (data) => {
            output += data.toString();
          });
          
          ps.on('close', () => {
            clearTimeout(timeout);
            resolve(output.trim() === 'READY');
          });
          
          ps.on('error', () => {
            clearTimeout(timeout);
            resolve(false);
          });
        });
        
        if (isReady) {
          this.logger.info(`COM: Rhino ready after ${attempt} seconds`);
          return true;
        }
        
        if (attempt % 5 === 0) {
          this.logger.info(`COM: Still waiting for Rhino... (${attempt}/${maxWaitSeconds})`);
        }
        
        // Warte 1 Sekunde vor nächstem Versuch
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        this.logger.debug(`COM: Connection attempt ${attempt} failed: ${error.message}`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    this.logger.error(`COM: Rhino not ready after ${maxWaitSeconds} seconds`);
    return false;
  }

  /**
   * Verbindet zu Rhino via COM Interface
   * @returns {Promise<boolean>} - True wenn Verbindung erfolgreich
   */
  async connectToRhino() {
    if (this.connected) {
      this.logger.info('COM: Already connected to Rhino');
      return true;
    }

    try {
      this.logger.info('COM: Attempting to connect to Rhino via COM...');
      
      const { spawn } = require('child_process');
      
      const connected = await new Promise((resolve) => {
        const timeout = setTimeout(() => {
          resolve(false);
        }, 5000);
        
        const ps = spawn('powershell', [
          '-Command', 
          'try { $rhino = New-Object -ComObject "Rhino.Application"; if ($rhino.Visible -ne $null) { Write-Output "SUCCESS" } else { Write-Output "FAILED" } } catch { Write-Output "ERROR" }'
        ], { 
          stdio: 'pipe',
          windowsHide: true 
        });
        
        let output = '';
        ps.stdout.on('data', (data) => {
          output += data.toString();
        });
        
        ps.on('close', () => {
          clearTimeout(timeout);
          resolve(output.trim() === 'SUCCESS');
        });
        
        ps.on('error', () => {
          clearTimeout(timeout);
          resolve(false);
        });
      });
      
      if (connected) {
        this.connected = true;
        this.logger.info('COM: Successfully connected to Rhino');
        return true;
      } else {
        this.logger.error('COM: Connection failed');
        return false;
      }
      
    } catch (error) {
      this.logger.error(`COM: Failed to connect to Rhino: ${error.message}`);
      return false;
    }
  }

  /**
   * Führt einen Rhino-Befehl via COM aus
   * @param {string} command - Der auszuführende Rhino-Befehl
   * @param {number} timeoutMs - Timeout in Millisekunden
   * @returns {Promise<Object>} - Ergebnis {success, output, error}
   */
  async executeCommand(command, timeoutMs = 10000) {
    if (!this.connected) {
      await this.connectToRhino();
    }

    try {
      this.logger.info(`COM: Executing command: ${command}`);
      
      const { spawn } = require('child_process');
      
      const result = await new Promise((resolve) => {
        const timeout = setTimeout(() => {
          resolve({ success: false, output: null, error: 'Command timeout' });
        }, timeoutMs);
        
        // Escape command for PowerShell
        const escapedCommand = command.replace(/"/g, '""');
        
        const ps = spawn('powershell', [
          '-Command', 
          `try { $rhino = New-Object -ComObject "Rhino.Application"; $result = $rhino.RunScript("${escapedCommand}"); Write-Output "SUCCESS:$result" } catch { Write-Output "ERROR:$($_.Exception.Message)" }`
        ], { 
          stdio: 'pipe',
          windowsHide: true 
        });
        
        let output = '';
        let errorOutput = '';
        
        ps.stdout.on('data', (data) => {
          output += data.toString();
        });
        
        ps.stderr.on('data', (data) => {
          errorOutput += data.toString();
        });
        
        ps.on('close', (code) => {
          clearTimeout(timeout);
          
          const fullOutput = output.trim();
          
          if (fullOutput.startsWith('SUCCESS:')) {
            const commandResult = fullOutput.replace('SUCCESS:', '').trim();
            resolve({ 
              success: true, 
              output: commandResult || 'Command completed', 
              error: null 
            });
          } else if (fullOutput.startsWith('ERROR:')) {
            const errorMessage = fullOutput.replace('ERROR:', '').trim();
            resolve({ 
              success: false, 
              output: null, 
              error: errorMessage || 'Unknown error' 
            });
          } else {
            // Unbekanntes Format - trotzdem als Erfolg werten wenn kein Fehler
            resolve({ 
              success: code === 0, 
              output: fullOutput || 'Command completed', 
              error: code !== 0 ? `Process exited with code ${code}` : null 
            });
          }
        });
        
        ps.on('error', (err) => {
          clearTimeout(timeout);
          resolve({ 
            success: false, 
            output: null, 
            error: `Process error: ${err.message}` 
          });
        });
      });
      
      if (result.success) {
        this.logger.info(`COM: Command executed successfully: ${result.output}`);
      } else {
        this.logger.error(`COM: Command failed: ${result.error}`);
      }
      
      return result;
      
    } catch (error) {
      this.logger.error(`COM: Command execution failed: ${error.message}`);
      return { success: false, output: null, error: error.message };
    }
  }

  /**
   * Startet Grasshopper via COM
   * @returns {Promise<Object>} - Ergebnis {success, message}
   */
  async startGrasshopper() {
    try {
      this.logger.info('COM: Starting Grasshopper...');
      
      const result = await this.executeCommand('Grasshopper', 15000);
      
      if (result.success) {
        // Warte kurz bis Grasshopper vollständig geladen ist
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        this.logger.info('COM: Grasshopper started successfully');
        return { success: true, message: 'Grasshopper started via COM' };
      } else {
        this.logger.error(`COM: Failed to start Grasshopper: ${result.error}`);
        return { success: false, message: `Failed to start Grasshopper: ${result.error}` };
      }
      
    } catch (error) {
      this.logger.error(`COM: Error starting Grasshopper: ${error.message}`);
      return { success: false, message: `Error starting Grasshopper: ${error.message}` };
    }
  }

  /**
   * Lädt eine Grasshopper-Datei via COM
   * @param {string} filePath - Pfad zur .gh-Datei
   * @returns {Promise<Object>} - Ergebnis {success, message, documentName}
   */
  async loadGrasshopperFile(filePath) {
    try {
      this.logger.info(`COM: Loading Grasshopper file: ${filePath}`);
      
      // Stelle sicher, dass Grasshopper läuft
      await this.startGrasshopper();
      
      // Verwende den korrekten Grasshopper-Befehl zum Laden von Dateien
      const loadCommand = `_GrasshopperLoadDocument "${filePath}"`;
      const result = await this.executeCommand(loadCommand, 20000);
      
      if (result.success) {
        // Warte bis Datei vollständig geladen ist
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Versuche Dokumentname zu ermitteln
        const docNameResult = await this.getActiveDocument();
        const documentName = docNameResult.success ? docNameResult.documentName : 'Unknown';
        
        this.logger.info(`COM: Grasshopper file loaded successfully: ${documentName}`);
        return { 
          success: true, 
          message: `File loaded successfully: ${documentName}`,
          documentName 
        };
      } else {
        this.logger.error(`COM: Failed to load file: ${result.error}`);
        return { success: false, message: `Failed to load file: ${result.error}` };
      }
      
    } catch (error) {
      this.logger.error(`COM: Error loading Grasshopper file: ${error.message}`);
      return { success: false, message: `Error loading file: ${error.message}` };
    }
  }

  /**
   * Ermittelt das aktive Grasshopper-Dokument
   * @returns {Promise<Object>} - Ergebnis {success, documentName}
   */
  async getActiveDocument() {
    try {
      // Grasshopper-spezifischer Befehl zum Ermitteln des aktiven Dokuments
      const result = await this.executeCommand('_GrasshopperDocumentName');
      
      if (result.success && result.output) {
        return { success: true, documentName: result.output };
      } else {
        return { success: false, documentName: null };
      }
      
    } catch (error) {
      this.logger.debug(`COM: Could not get active document: ${error.message}`);
      return { success: false, documentName: null };
    }
  }

  /**
   * Führt Viewport-Befehle aus (Maximieren, etc.)
   * @param {string} viewportCommand - Der Viewport-Befehl
   * @returns {Promise<Object>} - Ergebnis {success, message}
   */
  async executeViewportCommand(viewportCommand) {
    try {
      this.logger.info(`COM: Executing viewport command: ${viewportCommand}`);
      
      const result = await this.executeCommand(viewportCommand);
      
      if (result.success) {
        this.logger.info(`COM: Viewport command executed successfully`);
        return { success: true, message: `Viewport command executed: ${viewportCommand}` };
      } else {
        this.logger.warn(`COM: Viewport command failed: ${result.error}`);
        return { success: false, message: `Viewport command failed: ${result.error}` };
      }
      
    } catch (error) {
      this.logger.error(`COM: Error executing viewport command: ${error.message}`);
      return { success: false, message: `Error: ${error.message}` };
    }
  }

  /**
   * Aktiviert Präsentationsmodus via COM
   * @returns {Promise<Object>} - Ergebnis {success, message}
   */
  async activatePresentationMode() {
    try {
      this.logger.info('COM: Activating presentation mode...');
      
      const commands = [
        '_MaxViewport',
        '_SetView _Perspective', 
        '_SetDisplayMode _Rendered',
        '_ZoomExtents'
      ];
      
      const results = [];
      
      for (const command of commands) {
        const result = await this.executeViewportCommand(command);
        results.push(result);
        
        // Kurze Pause zwischen Befehlen
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      const successCount = results.filter(r => r.success).length;
      
      this.logger.info(`COM: Presentation mode activated (${successCount}/${commands.length} commands successful)`);
      return { 
        success: successCount > 0, 
        message: `Presentation mode activated (${successCount}/${commands.length} commands successful)` 
      };
      
    } catch (error) {
      this.logger.error(`COM: Error activating presentation mode: ${error.message}`);
      return { success: false, message: `Error: ${error.message}` };
    }
  }

  /**
   * Prüft ob Rhino via COM verfügbar ist
   * @returns {Promise<boolean>} - True wenn verfügbar
   */
  async isRhinoAvailable() {
    try {
      const { execSync } = require('child_process');
      
      const testScript = `
        try {
          $rhino = New-Object -ComObject "Rhino.Application"
          if ($rhino.Visible -ne $null) {
            Write-Output "true"
          } else {
            Write-Output "false"
          }
        } catch {
          Write-Output "false"
        }
      `;
      
      const result = execSync(`powershell -Command "${testScript.replace(/\n/g, '; ')}"`, 
        { encoding: 'utf8', timeout: 3000 }).trim();
      
      return result === 'true';
      
    } catch (error) {
      return false;
    }
  }

  /**
   * Trennt die COM-Verbindung
   */
  async disconnect() {
    if (this.connected) {
      this.logger.info('COM: Disconnecting from Rhino...');
      this.rhinoApp = null;
      this.connected = false;
    }
  }

  /**
   * Führt die ursprüngliche Registry-Befehlssequenz aus
   * Implementiert: "_-Grasshopper" -> "B D W L W H D O" -> "C:\path\to\file.gh" -> "W H" -> "_MaxViewport"
   * @param {string} filePath - Pfad zur .gh-Datei
   * @returns {Promise<Object>} - Ergebnis {success, message}
   */
  async executeRegistrySequence(filePath) {
    try {
      this.logger.info(`COM: Executing correct registry sequence for: ${filePath}`);
      
      // Phase 1: Starte Grasshopper mit dem korrekten Befehl "_-Grasshopper"
      // Das "-" verhindert das Dialog-Interface und aktiviert den Kommandozeilen-Modus
      this.logger.info('COM: Phase 1 - Starting Grasshopper with _-Grasshopper');
      const grasshopperStartResult = await this.executeCommand('_-Grasshopper', 15000);
      
      if (!grasshopperStartResult.success) {
        this.logger.warn('COM: _-Grasshopper failed, trying alternative start method');
        // Fallback: Versuche normalen Grasshopper-Start
        await this.executeCommand('Grasshopper', 15000);
      }
      
      // Warte bis Grasshopper vollständig geladen ist
      await new Promise(resolve => setTimeout(resolve, 4000));
      
      // Phase 2: Führe die Grasshopper-spezifischen Befehle aus
      // Diese werden IN Grasshopper eingegeben, nachdem es gestartet wurde
      const grasshopperCommands = [
        'B',  // Background (Hintergrund-Modus)
        'D',  // Display (Anzeige-Modus) 
        'W',  // Window (Fenster-Modus)
        'L',  // Load (Lade-Modus)
        'W',  // Wait (Warte-Modus)
        'H',  // Hide (Verstecken-Modus)
        'D',  // Document (Dokument-Modus)
        'O'   // Open (Öffnen-Modus)
      ];
      
      this.logger.info('COM: Phase 2 - Executing Grasshopper commands: B D W L W H D O');
      
      // Führe jeden Grasshopper-Befehl einzeln aus
      for (const cmd of grasshopperCommands) {
        try {
          const result = await this.executeCommand(cmd, 3000);
          this.logger.info(`COM: Grasshopper command '${cmd}' executed: ${result.success ? 'success' : 'failed'}`);
          await new Promise(resolve => setTimeout(resolve, 300)); // Etwas längere Pause zwischen Befehlen
        } catch (error) {
          this.logger.warn(`COM: Grasshopper command '${cmd}' failed: ${error.message}`);
          // Fortsetzung auch bei Fehlern einzelner Befehle
        }
      }
      
      // Phase 3: Gib den Dateipfad ein (wird in Grasshopper verarbeitet)
      this.logger.info(`COM: Phase 3 - Sending file path to Grasshopper: ${filePath}`);
      const filePathResult = await this.executeCommand(filePath, 20000);
      
      if (!filePathResult.success) {
        this.logger.warn('COM: Direct file path failed, trying with quotes');
        // Fallback: Versuche mit Anführungszeichen
        await this.executeCommand(`"${filePath}"`, 20000);
      }
      
      // Warte bis Datei vollständig geladen ist
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Phase 4: Führe die finalen Grasshopper-Befehle aus (W H)
      this.logger.info('COM: Phase 4 - Executing final Grasshopper commands: W H');
      await this.executeCommand('W', 2000); // Wait
      await new Promise(resolve => setTimeout(resolve, 500));
      await this.executeCommand('H', 2000); // Hide/Handle
      
      // Phase 5: Bestätige mit Enter (beendet den Grasshopper-Befehlsmodus)
      this.logger.info('COM: Phase 5 - Confirming with Enter');
      await this.executeCommand('_Enter', 1000);
      
      // Phase 6: Maximiere Viewport (_MaxViewport)
      this.logger.info('COM: Phase 6 - Maximizing viewport');
      await new Promise(resolve => setTimeout(resolve, 1000));
      await this.executeViewportCommand('_MaxViewport');
      
      // Phase 7: Bringe Fenster in den Vordergrund
      this.logger.info('COM: Phase 7 - Bringing window to foreground');
      await this.bringRhinoToForeground();
      
      this.logger.info('COM: Registry sequence completed successfully');
      return {
        success: true,
        message: 'Registry sequence executed successfully (_-Grasshopper → B D W L W H D O → file.gh → W H → _MaxViewport)',
        commandsExecuted: ['_-Grasshopper', ...grasshopperCommands, 'FilePath', 'W', 'H', '_Enter', '_MaxViewport', 'BringToForeground'],
        documentName: filePath.split('\\').pop() || filePath.split('/').pop() || 'Unknown'
      };
      
    } catch (error) {
      this.logger.error(`COM: Registry sequence failed: ${error.message}`);
      return {
        success: false,
        message: `Registry sequence failed: ${error.message}`
      };
    }
  }

  /**
   * Bringt das Rhino-Fenster in den Vordergrund
   * @returns {Promise<Object>} - Ergebnis {success, message}
   */
  async bringRhinoToForeground() {
    try {
      this.logger.info('COM: Bringing Rhino window to foreground...');
      
      const { execSync } = require('child_process');
      
      // PowerShell-Script um Rhino-Fenster zu finden und in den Vordergrund zu bringen
      const foregroundScript = `
        Add-Type -TypeDefinition '
          using System;
          using System.Diagnostics;
          using System.Runtime.InteropServices;
          public class Win32 {
            [DllImport("user32.dll")]
            public static extern bool SetForegroundWindow(IntPtr hWnd);
            [DllImport("user32.dll")]
            public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
          }
        '
        
        $rhinoProcess = Get-Process -Name "Rhino*" -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($rhinoProcess) {
          [Win32]::ShowWindow($rhinoProcess.MainWindowHandle, 3)  # SW_MAXIMIZE
          [Win32]::SetForegroundWindow($rhinoProcess.MainWindowHandle)
          Write-Output "FOREGROUND_SUCCESS"
        } else {
          Write-Output "FOREGROUND_NO_PROCESS"
        }
      `;
      
      const result = execSync(`powershell -Command "${foregroundScript.replace(/\n/g, '; ')}"`, 
        { encoding: 'utf8', timeout: 5000 }).trim();
      
      if (result === 'FOREGROUND_SUCCESS') {
        this.logger.info('COM: Rhino window brought to foreground successfully');
        return { success: true, message: 'Window brought to foreground' };
      } else {
        this.logger.warn('COM: Could not bring Rhino window to foreground');
        return { success: false, message: 'Could not find Rhino process' };
      }
      
    } catch (error) {
      this.logger.error(`COM: Error bringing window to foreground: ${error.message}`);
      return { success: false, message: `Error: ${error.message}` };
    }
  }

  /**
   * Cleanup-Methode
   */
  async cleanup() {
    await this.disconnect();
    this.logger.info('COM: Cleanup completed');
  }
}

module.exports = RhinoCOMController;
