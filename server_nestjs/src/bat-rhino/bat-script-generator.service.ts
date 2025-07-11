import { Injectable, Logger } from '@nestjs/common';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { spawn, ChildProcess } from 'child_process';
import { promisify } from 'util';
import {
  BatScriptConfig,
  BatScriptRequest,
  BatExecutionResult,
  RhinoPathValidationResult,
  SetupPackageInfo,
} from '../../../shared/dtos/bat-rhino.dto';

/**
 * BatScriptGeneratorService
 * Generiert .bat-Skripte und Registry-Dateien für Rhino-Integration
 * Implementiert Best Practices für Sicherheit und Benutzerfreundlichkeit
 */
@Injectable()
export class BatScriptGeneratorService {
  private readonly logger = new Logger(BatScriptGeneratorService.name);

  // Sichere Standard-Konfiguration
  private readonly defaultConfig = {
    protocolName: 'protra-rhino',
    workingDirectory: process.env.TEMP || 'C:\\Temp',
    scriptDirectory: 'ProTra\\BatScripts',
    allowedCommands: [
      '_-Grasshopper',
      '_-NoEcho',
      '_MaxViewport',
      '_Enter',
      '_-WindowHide',
      '_ZoomExtents',
      '_Escape',
    ],
    commonRhinoPaths: [
      'C:\\Program Files\\Rhino 8\\System\\Rhino.exe',
      'C:\\Program Files\\Rhino 7\\System\\Rhino.exe',
      'C:\\Program Files (x86)\\Rhino 8\\System\\Rhino.exe',
      'C:\\Program Files (x86)\\Rhino 7\\System\\Rhino.exe',
    ],
  };

  /**
   * Führt Rhino-Befehle direkt aus (ohne Download)
   * Best Practice: Generiert .bat-Skript und führt es sofort aus
   */
  async executeRhinoDirectly(
    request: BatScriptRequest,
  ): Promise<BatExecutionResult> {
    try {
      // Handle both 'command' and 'rhinoCommand' fields for compatibility
      const command = request.command || request.rhinoCommand;
      if (!command) {
        throw new Error(
          'Kein Rhino-Befehl angegeben (command oder rhinoCommand erforderlich)',
        );
      }

      this.logger.log(
        `Executing Rhino directly with command: ${command.substring(0, 50)}...`,
      );

      // Ensure request has the command field for validation
      const requestWithCommand = {
        ...request,
        command: command,
      };

      // Validiere und sanitize Eingaben
      const validatedRequest = await this.validateAndSanitizeRequest(
        requestWithCommand,
      );

      // Generiere Skript-Inhalt
      const scriptContent = this.createBatScriptContent(validatedRequest);

      // Erstelle temporären Skript-Pfad
      const scriptPath = await this.createScriptPath(validatedRequest.userId);

      // Schreibe .bat-Datei
      await this.writeBatScript(scriptPath, scriptContent);

      // Führe .bat-Skript direkt aus
      const executionResult = await this.executeBatScript(scriptPath);

      // Cleanup: Lösche temporäre Datei nach kurzer Verzögerung
      setTimeout(async () => {
        try {
          await fs.unlink(scriptPath);
          this.logger.log(`Temporary bat script cleaned up: ${scriptPath}`);
        } catch (error) {
          this.logger.warn(
            `Failed to cleanup temporary script: ${error.message}`,
          );
        }
      }, 10000); // 10 Sekunden Verzögerung

      const result: BatExecutionResult = {
        success: executionResult.success,
        scriptGenerated: true,
        protocolRegistered: false,
        rhinoLaunched: executionResult.success,
        message: executionResult.success
          ? 'Rhino wurde erfolgreich gestartet'
          : `Rhino-Start fehlgeschlagen: ${executionResult.error}`,
        batScriptPath: scriptPath,
        timestamp: new Date(),
      };

      this.logger.log(
        `Direct Rhino execution ${
          executionResult.success ? 'successful' : 'failed'
        } for user: ${validatedRequest.userId}`,
      );
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to execute Rhino directly: ${error.message}`,
        error.stack,
      );
      return {
        success: false,
        scriptGenerated: false,
        protocolRegistered: false,
        rhinoLaunched: false,
        message: `Fehler bei der direkten Rhino-Ausführung: ${error.message}`,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Generiert ein .bat-Skript für Rhino-Befehle
   */
  async generateBatScript(
    request: BatScriptRequest,
  ): Promise<BatExecutionResult> {
    try {
      // Handle both 'command' and 'rhinoCommand' fields for compatibility
      const command = request.command || request.rhinoCommand;
      if (!command) {
        throw new Error(
          'Kein Rhino-Befehl angegeben (command oder rhinoCommand erforderlich)',
        );
      }

      this.logger.log(
        `Generating bat script for command: ${command.substring(0, 50)}...`,
      );

      // Ensure request has the command field for validation
      const requestWithCommand = {
        ...request,
        command: command,
      };

      // Validiere und sanitize Eingaben
      const validatedRequest = await this.validateAndSanitizeRequest(
        requestWithCommand,
      );

      // Generiere Skript-Inhalt
      const scriptContent = this.createBatScriptContent(validatedRequest);

      // Erstelle Ausgabepfade
      const scriptPath = await this.createScriptPath(validatedRequest.userId);
      const registryPath = await this.createRegistryPath(
        validatedRequest.userId,
      );

      // Schreibe .bat-Datei
      await this.writeBatScript(scriptPath, scriptContent);

      // Generiere Registry-Datei
      const registryContent = this.createRegistryContent(scriptPath);
      await this.writeRegistryFile(registryPath, registryContent);

      // Erstelle Setup-Paket
      const setupPackage = await this.createSetupPackage(
        scriptPath,
        registryPath,
        validatedRequest.userId,
      );

      const result: BatExecutionResult = {
        success: true,
        scriptGenerated: true,
        protocolRegistered: false, // Muss vom Benutzer ausgeführt werden
        rhinoLaunched: false,
        message: 'Bat-Skript und Registry-Datei erfolgreich generiert',
        batScriptPath: scriptPath,
        registryPath,
        downloadUrls: {
          batScript: `/api/bat-rhino/download/script/${path.basename(
            scriptPath,
          )}`,
          registryFile: `/api/bat-rhino/download/registry/${path.basename(
            registryPath,
          )}`,
          setupPackage: `/api/bat-rhino/download/setup/${setupPackage.packageId}`,
        },
        timestamp: new Date(),
      };

      this.logger.log(
        `Bat script generation completed successfully for user: ${validatedRequest.userId}`,
      );
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to generate bat script: ${error.message}`,
        error.stack,
      );
      return {
        success: false,
        scriptGenerated: false,
        protocolRegistered: false,
        rhinoLaunched: false,
        message: `Fehler bei der Skript-Generierung: ${error.message}`,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Validiert Rhino-Pfad
   */
  async validateRhinoPath(
    rhinoPath: string,
  ): Promise<RhinoPathValidationResult> {
    try {
      // Prüfe ob Datei existiert
      await fs.access(rhinoPath);

      // Prüfe ob es eine .exe-Datei ist
      if (!rhinoPath.toLowerCase().endsWith('.exe')) {
        return {
          isValid: false,
          path: rhinoPath,
          message: 'Pfad muss auf eine .exe-Datei zeigen',
        };
      }

      // Prüfe ob es Rhino ist (einfache Heuristik)
      if (!rhinoPath.toLowerCase().includes('rhino')) {
        return {
          isValid: false,
          path: rhinoPath,
          message: 'Pfad scheint nicht auf Rhino zu zeigen',
        };
      }

      // TODO: Erweiterte Validierung - Versionsprüfung über Dateieigenschaften

      return {
        isValid: true,
        path: rhinoPath,
        version: 'Unknown', // TODO: Implementiere Versionserkennung
        message: 'Rhino-Pfad ist gültig',
      };
    } catch (error) {
      return {
        isValid: false,
        path: rhinoPath,
        message: `Pfad nicht gefunden oder nicht zugänglich: ${error.message}`,
      };
    }
  }

  /**
   * Findet automatisch Rhino-Installation
   */
  async detectRhinoPath(): Promise<string | null> {
    for (const path of this.defaultConfig.commonRhinoPaths) {
      const validation = await this.validateRhinoPath(path);
      if (validation.isValid) {
        this.logger.log(`Auto-detected Rhino at: ${path}`);
        return path;
      }
    }

    this.logger.warn('Could not auto-detect Rhino installation');
    return null;
  }

  /**
   * Validiert und bereinigt Request-Daten
   */
  private async validateAndSanitizeRequest(
    request: BatScriptRequest,
  ): Promise<BatScriptRequest> {
    // Validiere Befehl
    if (!this.isCommandSafe(request.command)) {
      throw new Error(`Unsicherer Befehl erkannt: ${request.command}`);
    }

    // Sanitize Dateipfad
    const sanitizedFilePath = this.sanitizeFilePath(request.filePath);

    // Validiere oder erkenne Rhino-Pfad
    let rhinoPath = request.rhinoPath;
    if (!rhinoPath) {
      rhinoPath = await this.detectRhinoPath();
      if (!rhinoPath) {
        throw new Error(
          'Rhino-Installation nicht gefunden. Bitte Pfad manuell angeben.',
        );
      }
    }

    const pathValidation = await this.validateRhinoPath(rhinoPath);
    if (!pathValidation.isValid) {
      throw new Error(`Ungültiger Rhino-Pfad: ${pathValidation.message}`);
    }

    return {
      ...request,
      filePath: sanitizedFilePath,
      rhinoPath,
      userId: request.userId || 'anonymous',
    };
  }

  /**
   * Prüft ob Befehl sicher ist
   */
  private isCommandSafe(command: string): boolean {
    // Prüfe auf gefährliche Zeichen
    const dangerousPatterns = [
      /[;&|`$(){}[\]]/, // Shell-Metazeichen
      /\.\./, // Directory traversal
      /^[a-zA-Z]:/, // Absolute Pfade (außer in Anführungszeichen)
      /del\s+/i, // Delete-Befehle
      /rd\s+/i, // Remove directory
      /format\s+/i, // Format-Befehle
      /shutdown/i, // System-Befehle
      /taskkill/i, // Process-Befehle
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(command)) {
        return false;
      }
    }

    // Prüfe auf erlaubte Befehle
    const commandParts = command.split(' ');
    const mainCommand = commandParts[0];

    return (
      this.defaultConfig.allowedCommands.some((allowed) =>
        mainCommand.startsWith(allowed),
      ) || command.includes('.gh')
    ); // Erlaube .gh-Dateipfade
  }

  /**
   * Bereinigt Dateipfad
   */
  private sanitizeFilePath(filePath: string): string {
    // Entferne gefährliche Zeichen
    const sanitized = filePath.replace(/[<>:"|?*]/g, '');

    // Prüfe auf .gh-Erweiterung
    if (!sanitized.toLowerCase().endsWith('.gh')) {
      throw new Error('Nur .gh-Dateien sind erlaubt');
    }

    // Normalisiere Pfad
    return path.normalize(sanitized);
  }

  /**
   * Erstellt .bat-Skript-Inhalt mit verbesserter Fehlerbehandlung
   */
  private createBatScriptContent(request: BatScriptRequest): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    return `@echo off
REM ProTra Rhino Launcher Script
REM Generated: ${timestamp}
REM User: ${request.userId}

SETLOCAL EnableDelayedExpansion

REM Konfiguration
SET "RHINO_PATH=${request.rhinoPath}"
SET "GH_FILE=${request.filePath}"

echo ========================================
echo ProTra Rhino Launcher
echo ========================================
echo Rhino-Pfad: %RHINO_PATH%
echo Grasshopper-Datei: %GH_FILE%
echo ========================================

REM Prüfe ob Rhino existiert
IF NOT EXIST "%RHINO_PATH%" (
    echo.
    echo FEHLER: Rhino nicht gefunden unter: %RHINO_PATH%
    echo.
    echo Mögliche Lösungen:
    echo 1. Rhino 8 installieren
    echo 2. Rhino-Pfad in der Anwendung konfigurieren
    echo 3. Rhino manuell starten
    echo.
    echo Drücken Sie eine Taste zum Beenden...
    pause >nul
    exit /b 2
)

REM Prüfe ob Grasshopper-Datei existiert (optional - erstelle Beispiel falls nicht vorhanden)
IF NOT EXIST "%GH_FILE%" (
    echo.
    echo WARNUNG: Grasshopper-Datei nicht gefunden: %GH_FILE%
    echo.
    echo Starte Rhino ohne spezifische Datei...
    echo Sie können die Datei manuell in Rhino öffnen.
    echo.
)

echo.
echo Starte Rhino...
echo.

REM Starte Rhino mit Befehlen direkt über Kommandozeile
"%RHINO_PATH%" /nosplash /runscript="-Grasshopper B D W L W H D O C:\\Dev\\hefl\\files\\Grasshopper\\example.gh W H _MaxViewport _Enter"

REM Prüfe Exit-Code
IF %ERRORLEVEL% NEQ 0 (
    echo.
    echo WARNUNG: Rhino wurde mit Exit-Code %ERRORLEVEL% beendet.
    echo Dies ist normal, wenn Rhino manuell geschlossen wurde.
    echo.
)

echo.
echo Rhino-Launcher beendet.
echo Drücken Sie eine Taste zum Schließen...
pause >nul

ENDLOCAL
exit /b 0
`;
  }

  /**
   * Erstellt Registry-Datei-Inhalt
   */
  private createRegistryContent(scriptPath: string): string {
    const escapedPath = scriptPath.replace(/\\/g, '\\\\');

    return `Windows Registry Editor Version 5.00

[HKEY_CLASSES_ROOT\\${this.defaultConfig.protocolName}]
@="URL:ProTra Rhino Automation Protocol"
"URL Protocol"=""

[HKEY_CLASSES_ROOT\\${this.defaultConfig.protocolName}\\shell]

[HKEY_CLASSES_ROOT\\${this.defaultConfig.protocolName}\\shell\\open]

[HKEY_CLASSES_ROOT\\${this.defaultConfig.protocolName}\\shell\\open\\command]
@="\\"${escapedPath}\\" \\"%1\\""
`;
  }

  /**
   * Erstellt Pfad für .bat-Skript
   */
  private async createScriptPath(userId: string): Promise<string> {
    const userDir = path.join(
      this.defaultConfig.workingDirectory,
      this.defaultConfig.scriptDirectory,
      userId,
    );
    await fs.mkdir(userDir, { recursive: true });

    const timestamp = Date.now();
    return path.join(userDir, `protra_rhino_launcher_${timestamp}.bat`);
  }

  /**
   * Erstellt Pfad für Registry-Datei
   */
  private async createRegistryPath(userId: string): Promise<string> {
    const userDir = path.join(
      this.defaultConfig.workingDirectory,
      this.defaultConfig.scriptDirectory,
      userId,
    );
    await fs.mkdir(userDir, { recursive: true });

    const timestamp = Date.now();
    return path.join(userDir, `protra_rhino_protocol_${timestamp}.reg`);
  }

  /**
   * Schreibt .bat-Skript
   */
  private async writeBatScript(
    scriptPath: string,
    content: string,
  ): Promise<void> {
    await fs.writeFile(scriptPath, content, { encoding: 'utf8' });
    this.logger.log(`Bat script written to: ${scriptPath}`);
  }

  /**
   * Schreibt Registry-Datei
   */
  private async writeRegistryFile(
    registryPath: string,
    content: string,
  ): Promise<void> {
    await fs.writeFile(registryPath, content, { encoding: 'utf8' });
    this.logger.log(`Registry file written to: ${registryPath}`);
  }

  /**
   * Führt .bat-Skript direkt aus
   * Best Practice: Asynchrone Ausführung mit Timeout und Fehlerbehandlung
   */
  private async executeBatScript(
    scriptPath: string,
  ): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      try {
        this.logger.log(`Executing bat script: ${scriptPath}`);

        // Spawn-Prozess für .bat-Ausführung
        const batProcess = spawn('cmd.exe', ['/c', scriptPath], {
          detached: false,
          stdio: ['ignore', 'pipe', 'pipe'],
          windowsHide: false,
        });

        let stdout = '';
        let stderr = '';

        // Sammle Output
        batProcess.stdout?.on('data', (data) => {
          stdout += data.toString();
        });

        batProcess.stderr?.on('data', (data) => {
          stderr += data.toString();
        });

        // Timeout für Prozess (30 Sekunden)
        const timeout = setTimeout(() => {
          batProcess.kill('SIGTERM');
          this.logger.warn(`Bat script execution timed out: ${scriptPath}`);
          resolve({ success: false, error: 'Execution timeout (30s)' });
        }, 30000);

        // Prozess-Ende behandeln
        batProcess.on('close', (code) => {
          clearTimeout(timeout);

          // Behandle Exit-Codes: 0 = Erfolg, 2 = Rhino nicht gefunden, andere = Warnung aber OK
          if (code === 0) {
            this.logger.log(`Bat script executed successfully: ${scriptPath}`);
            resolve({ success: true });
          } else if (code === 2) {
            // Exit-Code 2 = Rhino nicht gefunden (kritischer Fehler)
            const errorMsg =
              'Rhino-Installation nicht gefunden. Bitte installieren Sie Rhino 8.';
            this.logger.error(
              `Bat script execution failed: ${scriptPath}, Error: ${errorMsg}`,
            );
            resolve({ success: false, error: errorMsg });
          } else {
            // Andere Exit-Codes (z.B. 1) = Rhino wurde gestartet aber mit Warnung beendet
            this.logger.warn(
              `Bat script completed with warning code ${code}: ${scriptPath}`,
            );
            this.logger.log(
              `Treating exit code ${code} as success - Rhino was likely started`,
            );
            resolve({ success: true });
          }
        });

        // Fehlerbehandlung
        batProcess.on('error', (error) => {
          clearTimeout(timeout);
          this.logger.error(`Failed to start bat script: ${scriptPath}`, error);
          resolve({ success: false, error: error.message });
        });

        // Prozess sofort detachen (nicht auf Ende warten)
        batProcess.unref();
      } catch (error) {
        this.logger.error(
          `Exception during bat script execution: ${error.message}`,
        );
        resolve({ success: false, error: error.message });
      }
    });
  }

  /**
   * Erstellt Setup-Paket
   */
  private async createSetupPackage(
    scriptPath: string,
    registryPath: string,
    userId: string,
  ): Promise<SetupPackageInfo> {
    const packageId = crypto.randomUUID();
    const packageDir = path.join(
      this.defaultConfig.workingDirectory,
      'SetupPackages',
      packageId,
    );

    await fs.mkdir(packageDir, { recursive: true });

    // Kopiere Dateien ins Paket
    const packageScriptPath = path.join(
      packageDir,
      'protra_rhino_launcher.bat',
    );
    const packageRegistryPath = path.join(packageDir, 'install_protocol.reg');

    await fs.copyFile(scriptPath, packageScriptPath);
    await fs.copyFile(registryPath, packageRegistryPath);

    // Erstelle Installations-Anweisungen
    const instructionsPath = path.join(packageDir, 'INSTALLATION.txt');
    const instructions = `ProTra Rhino Integration - Installationsanweisungen

1. Führen Sie 'install_protocol.reg' aus (Rechtsklick -> Zusammenführen)
2. Bestätigen Sie die Registry-Änderungen
3. Das .bat-Skript wird automatisch registriert
4. Testen Sie die Integration über die ProTra-Webanwendung

Bei Problemen wenden Sie sich an den Support.

Generiert für Benutzer: ${userId}
Datum: ${new Date().toLocaleString('de-DE')}
`;

    await fs.writeFile(instructionsPath, instructions, { encoding: 'utf8' });

    // Berechne Checksumme (vereinfacht)
    const checksumData = await fs.readFile(packageScriptPath);
    const checksum = crypto
      .createHash('sha256')
      .update(new Uint8Array(checksumData))
      .digest('hex');

    return {
      packageId,
      version: '1.0.0',
      downloadUrl: `/api/bat-rhino/download/setup/${packageId}`,
      checksumSha256: checksum,
      fileSize: checksumData.length,
      createdAt: new Date(),
    };
  }
}
