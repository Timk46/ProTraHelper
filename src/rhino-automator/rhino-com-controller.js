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
   * FIX #5: Detects correct PowerShell executable for Rhino COM (32-bit vs 64-bit)
   * @returns {string} - Path to PowerShell executable
   * @private
   */
  _getPowerShellPath() {
    const fs = require('fs');

    // Try 64-bit PowerShell first (most common for Rhino 7+)
    const ps64 = 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe';

    // Fallback to 32-bit PowerShell (if Rhino is 32-bit)
    const ps32 = 'C:\\Windows\\SysWOW64\\WindowsPowerShell\\v1.0\\powershell.exe';

    // Note: Rhino 7+ is 64-bit, Rhino 6 and earlier may be 32-bit
    // For now, prefer 64-bit PowerShell (matches most Rhino installations)

    if (fs.existsSync(ps64)) {
      return ps64;
    } else if (fs.existsSync(ps32)) {
      this.logger.warn('PS-Base64: Using 32-bit PowerShell (64-bit not found)');
      return ps32;
    }

    // Fallback to system PATH (default PowerShell)
    this.logger.warn('PS-Base64: Using PowerShell from system PATH');
    return 'powershell';
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
      // Log script size before encoding
      const scriptSizeKB = (Buffer.byteLength(script, 'utf16le') / 1024).toFixed(2);
      this.logger.debug(`PS-Base64: Script size: ${scriptSizeKB}KB (before encoding)`);

      // Convert script to Base64 for safe execution
      const scriptBase64 = Buffer.from(script, 'utf16le').toString('base64');

      // Log EncodedCommand length
      this.logger.debug(`PS-Base64: EncodedCommand length: ${scriptBase64.length} chars`);

      const startTime = Date.now();

      // FIX #5: Use architecture-specific PowerShell path
      const psPath = this._getPowerShellPath();

      // FIX #1: Increase maxBuffer to capture full CLIXML errors (10MB instead of default 1MB)
      // Also capture stderr in addition to stdout
      // CRITICAL FIX: Use -NoProfile to prevent PowerShell profile.ps1 from contaminating output
      const { stdout, stderr } = await execAsync(
        `"${psPath}" -NoProfile -EncodedCommand ${scriptBase64}`,
        {
          encoding: 'utf8',
          timeout,
          maxBuffer: 10 * 1024 * 1024  // 10MB buffer for verbose CLIXML errors
        }
      );

      const duration = Date.now() - startTime;
      this.logger.debug(`PS-Base64: Execution completed in ${duration}ms`);

      // FIX #1: Log stderr if present (contains error details in CLIXML format)
      if (stderr && stderr.trim()) {
        this.logger.warn(`PS-Base64: STDERR output (${stderr.length} chars):\n${stderr}`);
      }

      return stdout.trim();
    } catch (error) {
      // FIX #1: Enhanced error logging with full CLIXML parsing
      this.logger.error(`PS-Base64: Execution failed: ${error.message}`);

      // Parse CLIXML error format to extract meaningful error information
      if (error.stderr && error.stderr.includes('#< CLIXML')) {
        this.logger.error(`PS-Base64: Full CLIXML error (${error.stderr.length} chars):\n${error.stderr}`);

        // Extract actual error message from CLIXML XML
        const errorMatch = error.stderr.match(/<S S="Error">([^<]+)<\/S>/);
        if (errorMatch) {
          const parsedError = errorMatch[1];
          this.logger.error(`PS-Base64: Parsed error message: ${parsedError}`);
        }

        // Extract exception type
        const exceptionMatch = error.stderr.match(/<S S="Error">.*?Exception.*?<\/S>/i);
        if (exceptionMatch) {
          this.logger.error(`PS-Base64: Exception type: ${exceptionMatch[0]}`);
        }
      } else if (error.stderr) {
        // Non-CLIXML error
        this.logger.error(`PS-Base64: STDERR: ${error.stderr}`);
      }

      throw error;
    }
  }

  /**
   * Wartet bis Rhino via COM verfügbar ist
   * @param {number} maxAttempts - Maximale Anzahl an Verbindungsversuchen (default: 10)
   * @returns {Promise<boolean>} - True wenn Rhino bereit ist
   */
  async waitForRhinoReady(maxAttempts = 10) {
    this.logger.info(`COM: Waiting for Rhino to be ready for COM connection (max ${maxAttempts} attempts)...`);

    // FIX #4: Check COM registration BEFORE attempting connection
    // This provides fast diagnosis if Rhino is not properly installed
    const regCheck = await this.checkRhinoRegistration();
    if (!regCheck.registered) {
      this.logger.error(`COM: Cannot proceed - ${regCheck.error}`);
      this.logger.error('COM: Fix: Reinstall Rhino or run: regsvr32 /i RhinoScript.dll (as Administrator)');
      return false;
    }

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        // FIX #3: Enhanced error detection with specific error codes
        const testScript = `
          try {
            $rhino = New-Object -ComObject "Rhino.Application"
            $visible = $rhino.Visible
            Write-Output "RHINO_READY"
          } catch {
            # Extract specific COM error code
            $errorCode = $_.Exception.HResult

            # 0x80040154 (-2147221164) = REGDB_E_CLASSNOTREG (Class not registered)
            if ($errorCode -eq -2147221164) {
              Write-Output "RHINO_NOT_REGISTERED"
            }
            # 0x800401F3 (-2147221005) = CO_E_CLASSSTRING (Invalid class string)
            elseif ($errorCode -eq -2147221005) {
              Write-Output "RHINO_INVALID_PROGID"
            }
            # 0x80080005 (-2146959355) = CO_E_SERVER_EXEC_FAILURE (Server execution failed)
            elseif ($errorCode -eq -2146959355) {
              Write-Output "RHINO_SERVER_EXEC_FAILED"
            }
            # Any other error = COM server not ready yet (still initializing)
            else {
              Write-Output "RHINO_NOT_READY:$errorCode"
            }
          }
        `;

        // FIX #3: Use longer timeout for first few attempts (COM startup can be slow)
        // FIX #6: CRITICAL - Increase timeout to allow Rhino COM server to fully initialize
        // Previous values (5000/3000ms) were too short - PowerShell was killed at timeout
        // before COM server finished initialization, causing truncated CLIXML errors
        // FIX #7: Progressive timeout strategy for 2-minute Rhino startup scenarios
        // Attempts 1-3: 30s (fast systems), 4-6: 45s (medium), 7-10: 60s (slow systems)
        const attemptTimeout = attempt <= 3 ? 30000 : attempt <= 6 ? 45000 : 60000;
        const result = await this._executePowerShellBase64(testScript, attemptTimeout);

        if (result === 'RHINO_READY') {
          this.logger.info(`COM: ✓✓✓ Rhino ready after ${attempt} attempt(s) ✓✓✓`);
          return true;
        }

        // FIX #3: CRITICAL - Fail fast if COM object will NEVER be available
        if (result === 'RHINO_NOT_REGISTERED') {
          this.logger.error('COM: ✗ FATAL - Rhino COM object not registered in Windows Registry');
          this.logger.error('COM: Error code: 0x80040154 (REGDB_E_CLASSNOTREG)');
          this.logger.error('COM: Solution: Run as Administrator: regsvr32 /i RhinoScript.dll');
          this.logger.error('COM: Or reinstall Rhino to re-register COM server');
          return false;
        }

        if (result === 'RHINO_INVALID_PROGID') {
          this.logger.error('COM: ✗ FATAL - "Rhino.Application" ProgID not found');
          this.logger.error('COM: Error code: 0x800401F3 (CO_E_CLASSSTRING)');
          this.logger.error('COM: Solution: Reinstall Rhino and ensure COM server registration');
          return false;
        }

        if (result === 'RHINO_SERVER_EXEC_FAILED') {
          this.logger.error('COM: ✗ FATAL - Server execution failed');
          this.logger.error('COM: Error code: 0x80080005 (CO_E_SERVER_EXEC_FAILURE)');
          this.logger.error('COM: Possible causes: Permissions, corrupted installation, antivirus');
          return false;
        }

        // FIX #3: Enhanced progress logging with error codes and timeout info
        if (attempt % 5 === 0 || attempt <= 3) {
          this.logger.info(`COM: Still waiting for Rhino... (${attempt}/${maxAttempts}, timeout: ${attemptTimeout/1000}s) - Status: ${result}`);
        }

        // Warte 1 Sekunde vor nächstem Versuch
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        // FIX #3: Detect permanent errors from exception message
        const errorMsg = error.message || '';

        this.logger.debug(`COM: Attempt ${attempt} exception: ${errorMsg.substring(0, 200)}`);

        // Check if this is a permanent registration error
        if (errorMsg.includes('0x80040154') || errorMsg.includes('REGDB_E_CLASSNOTREG')) {
          this.logger.error('COM: ✗ FATAL - Rhino COM class not registered (detected in exception)');
          return false;
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    this.logger.error(`COM: ✗ Rhino not ready after ${maxAttempts} attempts`);
    this.logger.error(`COM: Possible causes: Rhino too slow to start, COM server not registered, insufficient permissions`);
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
      // FIX #11: Match waitForRhinoReady() logic - don't check if Visible is null
      // The Visible property can be null even when COM connection is working
      const connectScript = `
        try {
          $rhino = New-Object -ComObject "Rhino.Application"
          $visible = $rhino.Visible
          Write-Output "CONNECTION_SUCCESS"
        } catch {
          Write-Output "CONNECTION_ERROR: $($_.Exception.Message)"
        }
      `;

      // FIX #8: Increase timeout to match waitForRhinoReady (60s instead of 5s)
      // Previous 5s timeout caused "CLIXML error (11 chars)" - PowerShell was killed
      this.logger.debug('COM: Creating COM connection with 60s timeout...');
      const startTime = Date.now();

      const result = await this._executePowerShellBase64(connectScript, 60000);

      const duration = Date.now() - startTime;
      this.logger.debug(`COM: Connection attempt completed in ${duration}ms`);

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

      // FIX #8: Enhanced error logging for connection failures
      if (error.stderr && error.stderr.includes('#< CLIXML')) {
        this.logger.error('COM: Connection timeout - PowerShell process was killed');
        this.logger.error('COM: Rhino COM server may still be initializing (needs more time)');
        this.logger.error(`COM: Consider increasing timeout beyond 60s if this persists`);
      }

      return false;
    }
  }

  /**
   * Führt einen Rhino-Befehl via COM aus
   * SECURITY: Verwendet Base64-Encoding um Command Injection zu verhindern
   * @param {string} command - Der auszuführende Rhino-Befehl
   * @param {number} timeoutMs - Timeout in Millisekunden (default: 30s für Grasshopper-Commands)
   * @returns {Promise<Object>} - Ergebnis {success, output, error}
   */
  async executeCommand(command, timeoutMs = 30000) {
    if (!this.connected) {
      await this.connectToRhino();
    }

    try {
      // ENHANCED LOGGING: Log raw command received (truncate if very long)
      const displayCommand = command.length > 200 ? command.substring(0, 200) + '...' : command;
      this.logger.info(`COM-EXEC: Raw command received: ${displayCommand}`);

      // CRITICAL FIX: Use _executePowerShellBase64() to avoid quote escaping issues
      // Previous implementation used nested quotes in -Command "..." which caused parsing errors
      // on remote clients, preventing Grasshopper commands from reaching Rhino

      // Encode command to Base64 for safe PowerShell transmission
      const commandBuffer = Buffer.from(command, 'utf16le');
      const commandBase64 = commandBuffer.toString('base64');

      // ENHANCED LOGGING: Log Base64 encoding (show first 50 chars for security)
      this.logger.debug(`COM-EXEC: Command encoded to Base64 (${commandBase64.length} chars): ${commandBase64.substring(0, 50)}...`);

      // Build PowerShell script that decodes and executes the Rhino command
      // ENHANCED: Added internal logging to PowerShell script
      const commandScript = `
        try {
          Write-Output "PS-INTERNAL: Creating COM object..."
          $rhino = New-Object -ComObject "Rhino.Application"

          Write-Output "PS-INTERNAL: Decoding Base64 command..."
          $commandBytes = [System.Convert]::FromBase64String("${commandBase64}")
          $command = [System.Text.Encoding]::Unicode.GetString($commandBytes)

          Write-Output "PS-INTERNAL: Decoded command: $command"
          Write-Output "PS-INTERNAL: Executing RunScript..."
          $result = $rhino.RunScript($command, $true)

          Write-Output "COMMAND_SUCCESS: $result"
        } catch {
          Write-Output "COMMAND_ERROR: $($_.Exception.Message)"
        }
      `;

      // ENHANCED LOGGING: Log execution method
      this.logger.debug(`COM-EXEC: Using _executePowerShellBase64() with -EncodedCommand (timeout: ${timeoutMs}ms)`);

      const startTime = Date.now();

      // Use _executePowerShellBase64() which encodes the ENTIRE script as Base64
      // and uses -EncodedCommand instead of -Command "..." (no quote nesting issues!)
      const result = await this._executePowerShellBase64(commandScript, timeoutMs);

      const executionTime = Date.now() - startTime;

      // ENHANCED LOGGING: Log raw PowerShell result
      const displayResult = result.length > 500 ? result.substring(0, 500) + '...' : result;
      this.logger.debug(`COM-EXEC: Raw PowerShell result (${executionTime}ms): ${displayResult}`);

      if (result.startsWith('COMMAND_SUCCESS:')) {
        const output = result.replace('COMMAND_SUCCESS:', '').trim();
        this.logger.info(`COM-EXEC: ✓ Command executed successfully in ${executionTime}ms. Output: ${output}`);
        return { success: true, output, error: null };
      } else if (result.startsWith('COMMAND_ERROR:')) {
        const error = result.replace('COMMAND_ERROR:', '').trim();
        this.logger.error(`COM-EXEC: ✗ Command failed after ${executionTime}ms. Error: ${error}`);
        return { success: false, output: null, error };
      } else {
        // Handle unexpected output format
        this.logger.warn(`COM-EXEC: ⚠ Unexpected result format after ${executionTime}ms: ${displayResult}`);
        return { success: true, output: result, error: null };
      }

    } catch (error) {
      this.logger.error(`COM-EXEC: ✗ Command execution exception: ${error.message}`);
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

      // FIX #9: Use default timeout (30s) instead of hardcoded 15s
      const result = await this.executeCommand('Grasshopper');
      
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
    const startTime = Date.now();

    try {
      this.logger.info(`GH-LOAD: ═══════════════════════════════════════════════════════`);
      this.logger.info(`GH-LOAD: Starting Grasshopper file load process`);
      this.logger.info(`GH-LOAD: File path: ${filePath}`);

      // Stelle sicher, dass Grasshopper läuft
      this.logger.info(`GH-LOAD: [Step 1/5] Ensuring Grasshopper is running...`);
      await this.startGrasshopper();
      this.logger.info(`GH-LOAD: [Step 1/5] ✓ Grasshopper startup initiated`);

      // Verwende den bewährten Befehl aus bat-rhino.service.ts (mit Bindestrich!)
      const loadCommand = `_-Grasshopper B D W L W H D O "${filePath}" W _MaxViewport _Enter`;
      this.logger.info(`GH-LOAD: [Step 2/5] Sending load command to Rhino console...`);
      this.logger.info(`GH-LOAD: Command: ${loadCommand}`);

      // FIX #9: Increase timeout to 45s (was 20s - too short for complex Grasshopper load)
      const result = await this.executeCommand(loadCommand, 45000);

      if (result.success) {
        this.logger.info(`GH-LOAD: [Step 2/5] ✓ Load command executed successfully`);

        // Warte bis Datei vollständig geladen ist
        this.logger.info(`GH-LOAD: [Step 3/5] Waiting 2 seconds for file to load completely...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        this.logger.info(`GH-LOAD: [Step 3/5] ✓ Wait completed`);

        // Versuche Dokumentname zu ermitteln
        this.logger.info(`GH-LOAD: [Step 4/5] Retrieving active document name...`);
        const docNameResult = await this.getActiveDocument();
        const documentName = docNameResult.success ? docNameResult.documentName : 'Unknown';
        this.logger.info(`GH-LOAD: [Step 4/5] ✓ Document name: ${documentName}`);

        const totalTime = Date.now() - startTime;
        this.logger.info(`GH-LOAD: [Step 5/5] ✓✓✓ File loaded successfully in ${totalTime}ms ✓✓✓`);
        this.logger.info(`GH-LOAD: ═══════════════════════════════════════════════════════`);

        return {
          success: true,
          message: `File loaded successfully: ${documentName}`,
          documentName
        };
      } else {
        const totalTime = Date.now() - startTime;
        this.logger.error(`GH-LOAD: [Step 2/5] ✗ Load command failed after ${totalTime}ms`);
        this.logger.error(`GH-LOAD: Error details: ${result.error}`);
        this.logger.error(`GH-LOAD: ═══════════════════════════════════════════════════════`);
        return { success: false, message: `Failed to load file: ${result.error}` };
      }

    } catch (error) {
      const totalTime = Date.now() - startTime;
      this.logger.error(`GH-LOAD: ✗✗✗ Exception after ${totalTime}ms: ${error.message}`);
      this.logger.error(`GH-LOAD: Stack trace: ${error.stack}`);
      this.logger.error(`GH-LOAD: ═══════════════════════════════════════════════════════`);
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

      // FIX #9: Increase timeout to 60s (was 3s - too short for New-Object -ComObject!)
      // This method checks COM availability, needs same timeout as connectToRhino()
      const result = await this._executePowerShellBase64(testScript, 60000);

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
   * FIX #4: Diagnostics - Check if Rhino COM object is registered in Windows Registry
   * @returns {Promise<Object>} - {registered: boolean, clsid: string|null, error: string|null}
   */
  async checkRhinoRegistration() {
    try {
      this.logger.info('COM-DIAG: Checking Rhino COM registration in Windows Registry...');

      const diagScript = `
        # Check if ProgID exists in registry
        $progId = "Rhino.Application"
        $regPath = "Registry::HKEY_CLASSES_ROOT\\$progId"

        if (Test-Path $regPath) {
          $clsidPath = Join-Path $regPath "CLSID"
          if (Test-Path $clsidPath) {
            $clsid = (Get-ItemProperty $clsidPath).'(default)'
            Write-Output "REGISTERED:$clsid"
          } else {
            Write-Output "NO_CLSID"
          }
        } else {
          Write-Output "NOT_REGISTERED"
        }
      `;

      // FIX #8: Increase timeout for registry check (15s instead of 5s)
      const result = await this._executePowerShellBase64(diagScript, 15000);

      if (result.startsWith('REGISTERED:')) {
        const clsid = result.replace('REGISTERED:', '').trim();
        this.logger.info(`COM-DIAG: ✓ Rhino.Application registered with CLSID: ${clsid}`);
        return { registered: true, clsid, error: null };
      } else if (result === 'NO_CLSID') {
        this.logger.error('COM-DIAG: ✗ Rhino.Application ProgID exists but has no CLSID');
        return { registered: false, clsid: null, error: 'ProgID has no CLSID mapping' };
      } else {
        this.logger.error('COM-DIAG: ✗ Rhino.Application not registered in Windows Registry');
        this.logger.error('COM-DIAG: Expected registry path: HKEY_CLASSES_ROOT\\Rhino.Application');
        return { registered: false, clsid: null, error: 'ProgID not found in HKEY_CLASSES_ROOT' };
      }

    } catch (error) {
      this.logger.error(`COM-DIAG: Failed to check registration: ${error.message}`);
      return { registered: false, clsid: null, error: error.message };
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
      // FIX #9: Use default timeout (30s) instead of hardcoded 15s
      const grasshopperStartCommand = 'Grasshopper';
      await this.executeCommand(grasshopperStartCommand);
      
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
          // FIX #10: Increase timeout from 2s to 30s (registry commands use COM internally)
          await this.executeCommand(cmd, 30000);
          await new Promise(resolve => setTimeout(resolve, 200)); // Kurze Pause zwischen Befehlen
        } catch (error) {
          this.logger.warn(`COM: Registry command '${cmd}' failed: ${error.message}`);
          // Fortsetzung auch bei Fehlern einzelner Befehle
        }
      }
      
      // Phase 3: Lade die Grasshopper-Datei mit bewährtem Befehl (mit Bindestrich!)
      this.logger.info(`COM: Loading file: ${filePath}`);
      const loadCommand = `_-Grasshopper B D W L W H D O "${filePath}" W _MaxViewport _Enter`;
      // FIX #10: Increase timeout from 20s to 45s (complex Grasshopper file loads can be slow)
      const loadResult = await this.executeCommand(loadCommand, 45000);

      if (!loadResult.success) {
        // Fallback: Versuche alternativen Lade-Befehl
        const altLoadCommand = `_-Grasshopper _DocumentOpen "${filePath}" _Enter`;
        // FIX #10: Increase timeout from 20s to 45s (fallback load also needs sufficient time)
        await this.executeCommand(altLoadCommand, 45000);
      }
      
      // Warte bis Datei vollständig geladen ist
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Phase 4: Führe die finalen Registry-Befehle aus (W H)
      // FIX #10: Increase timeout from 1s to 30s (final commands use COM internally)
      await this.executeCommand('W', 30000); // Wait
      await this.executeCommand('H', 30000); // Hide/Handle
      
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
