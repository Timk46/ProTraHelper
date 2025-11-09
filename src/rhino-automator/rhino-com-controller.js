/**
 * RhinoCOMController - COM Automation für zuverlässige Rhino-Steuerung
 *
 * Löst /runscript Probleme durch direkte COM-Interface Kommunikation
 * Ersetzt unzuverlässige Command-Line Parameter
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

class RhinoCOMController {
  constructor(logger) {
    this.logger = logger;
    this.rhinoApp = null;
    this.connected = false;
    this.connectionAttempts = 0;
    this.maxConnectionAttempts = 10;
  }

  /**
   * SECURITY: Executes PowerShell script using Base64 encoding to prevent injection attacks
   * @param {string} script - PowerShell script to execute
   * @param {number} timeout - Timeout in milliseconds
   * @returns {Promise<string>} - Script output (stdout)
   * @private
   */
  async _executePowerShellBase64(script, timeout = 5000) {
    try {
      // Convert script to Base64 for safe execution
      const scriptBase64 = Buffer.from(script, 'utf16le').toString('base64');

      // Use -EncodedCommand instead of -Command to prevent injection
      const { stdout } = await execAsync(
        `powershell -EncodedCommand ${scriptBase64}`,
        { encoding: 'utf8', timeout }
      );

      return stdout.trim();
    } catch (error) {
      this.logger.debug(`PowerShell execution failed: ${error.message}`);
      throw error;
    }
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
        // SECURITY FIX: PowerShell-Script zum Testen der COM-Verfügbarkeit
        const testScript = `
          try {
            $rhino = New-Object -ComObject "Rhino.Application"
            $rhino.Visible
            Write-Output "RHINO_READY"
          } catch {
            Write-Output "RHINO_NOT_READY"
          }
        `;

        // Use Base64-encoded PowerShell execution to prevent injection
        const result = await this._executePowerShellBase64(testScript, 3000);

        if (result === 'RHINO_READY') {
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

      // SECURITY FIX: PowerShell für COM-Verbindung (Base64-encoded)
      const connectScript = `
        try {
          $rhino = New-Object -ComObject "Rhino.Application"
          if ($rhino.Visible -ne $null) {
            Write-Output "CONNECTION_SUCCESS"
          } else {
            Write-Output "CONNECTION_FAILED"
          }
        } catch {
          Write-Output "CONNECTION_ERROR: $($_.Exception.Message)"
        }
      `;

      // Use Base64-encoded PowerShell execution to prevent injection
      const result = await this._executePowerShellBase64(connectScript, 5000);

      if (result === 'CONNECTION_SUCCESS') {
        this.connected = true;
        this.logger.info('COM: Successfully connected to Rhino');
        return true;
      } else {
        this.logger.error(`COM: Connection failed: ${result}`);
        return false;
      }

    } catch (error) {
      this.logger.error(`COM: Failed to connect to Rhino: ${error.message}`);
      return false;
    }
  }

  /**
   * Führt einen Rhino-Befehl via COM aus
   * SECURITY: Verwendet Base64-Encoding um Command Injection zu verhindern
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

      // CRITICAL FIX: Use _executePowerShellBase64() to avoid quote escaping issues
      // Previous implementation used nested quotes in -Command "..." which caused parsing errors
      // on remote clients, preventing Grasshopper commands from reaching Rhino

      // Encode command to Base64 for safe PowerShell transmission
      const commandBuffer = Buffer.from(command, 'utf16le');
      const commandBase64 = commandBuffer.toString('base64');

      // Build PowerShell script that decodes and executes the Rhino command
      const commandScript = `
        try {
          $rhino = New-Object -ComObject "Rhino.Application"
          $commandBytes = [System.Convert]::FromBase64String("${commandBase64}")
          $command = [System.Text.Encoding]::Unicode.GetString($commandBytes)
          $result = $rhino.RunScript($command, $true)
          Write-Output "COMMAND_SUCCESS: $result"
        } catch {
          Write-Output "COMMAND_ERROR: $($_.Exception.Message)"
        }
      `;

      // Use _executePowerShellBase64() which encodes the ENTIRE script as Base64
      // and uses -EncodedCommand instead of -Command "..." (no quote nesting issues!)
      const result = await this._executePowerShellBase64(commandScript, timeoutMs);

      if (result.startsWith('COMMAND_SUCCESS:')) {
        const output = result.replace('COMMAND_SUCCESS:', '').trim();
        this.logger.info(`COM: Command executed successfully: ${output}`);
        return { success: true, output, error: null };
      } else if (result.startsWith('COMMAND_ERROR:')) {
        const error = result.replace('COMMAND_ERROR:', '').trim();
        this.logger.error(`COM: Command failed: ${error}`);
        return { success: false, output: null, error };
      } else {
        // Handle unexpected output format
        this.logger.warn(`COM: Unexpected command result format: ${result}`);
        return { success: true, output: result, error: null };
      }

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
      
      // Verwende den bewährten Befehl aus bat-rhino.service.ts (mit Bindestrich!)
      const loadCommand = `_-Grasshopper B D W L W H D O "${filePath}" W _MaxViewport _Enter`;
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
      // SECURITY FIX: PowerShell-Script mit Base64-Encoding
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

      // Use Base64-encoded PowerShell execution to prevent injection
      const result = await this._executePowerShellBase64(testScript, 3000);

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
   * Implementiert: "-Grasshopper B D W L W H D O C:\path\to\file.gh W H _MaxViewport _Enter"
   * @param {string} filePath - Pfad zur .gh-Datei
   * @returns {Promise<Object>} - Ergebnis {success, message}
   */
  async executeRegistrySequence(filePath) {
    try {
      this.logger.info(`COM: Executing registry sequence for: ${filePath}`);
      
      // Phase 1: Starte Grasshopper mit den ursprünglichen Registry-Befehlen
      // B D W L W H D O sind spezielle Grasshopper-Befehle aus der Registry
      const grasshopperStartCommand = 'Grasshopper';
      await this.executeCommand(grasshopperStartCommand, 15000);
      
      // Warte bis Grasshopper vollständig geladen ist
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Phase 2: Führe die Registry-Befehlssequenz aus
      // Diese Befehle entsprechen den ursprünglichen "B D W L W H D O" Parametern
      const registryCommands = [
        'B',  // Background (Hintergrund-Modus)
        'D',  // Display (Anzeige-Modus)
        'W',  // Window (Fenster-Modus)
        'L',  // Load (Lade-Modus)
        'W',  // Wait (Warte-Modus)
        'H',  // Hide (Verstecken-Modus)
        'D',  // Document (Dokument-Modus)
        'O'   // Open (Öffnen-Modus)
      ];
      
      this.logger.info('COM: Executing registry command sequence: B D W L W H D O');
      
      // Führe jeden Registry-Befehl einzeln aus
      for (const cmd of registryCommands) {
        try {
          await this.executeCommand(cmd, 2000);
          await new Promise(resolve => setTimeout(resolve, 200)); // Kurze Pause zwischen Befehlen
        } catch (error) {
          this.logger.warn(`COM: Registry command '${cmd}' failed: ${error.message}`);
          // Fortsetzung auch bei Fehlern einzelner Befehle
        }
      }
      
      // Phase 3: Lade die Grasshopper-Datei mit bewährtem Befehl (mit Bindestrich!)
      this.logger.info(`COM: Loading file: ${filePath}`);
      const loadCommand = `_-Grasshopper B D W L W H D O "${filePath}" W _MaxViewport _Enter`;
      const loadResult = await this.executeCommand(loadCommand, 20000);

      if (!loadResult.success) {
        // Fallback: Versuche alternativen Lade-Befehl
        const altLoadCommand = `_-Grasshopper _DocumentOpen "${filePath}" _Enter`;
        await this.executeCommand(altLoadCommand, 20000);
      }
      
      // Warte bis Datei vollständig geladen ist
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Phase 4: Führe die finalen Registry-Befehle aus (W H)
      await this.executeCommand('W', 1000); // Wait
      await this.executeCommand('H', 1000); // Hide/Handle
      
      // Phase 5: Maximiere Viewport (_MaxViewport)
      await this.executeViewportCommand('_MaxViewport');
      
      // Phase 6: Bringe Fenster in den Vordergrund
      await this.bringRhinoToForeground();
      
      this.logger.info('COM: Registry sequence completed successfully');
      return {
        success: true,
        message: 'Registry sequence executed successfully (B D W L W H D O + file load + MaxViewport)',
        commandsExecuted: ['Grasshopper', ...registryCommands, 'LoadDocument', 'W', 'H', '_MaxViewport', 'BringToForeground']
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

      // SECURITY FIX: PowerShell-Script um Rhino-Fenster zu finden (Base64-encoded)
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

      // Use Base64-encoded PowerShell execution to prevent injection
      const result = await this._executePowerShellBase64(foregroundScript, 5000);

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
