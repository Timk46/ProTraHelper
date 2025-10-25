/**
 * Direct Rhino Service
 * Implementiert direkte Rhino-Ausführung über Windows-Prozesse
 * Registry-basierte Rhino-Erkennung und Fallback-Mechanismen
 */

import { Injectable } from '@nestjs/common';
import { spawn, execFile } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import {
  DirectRhinoLaunchRequest,
  DirectRhinoLaunchResponseDTO,
  RhinoInstallation,
  SystemRhinoInfoDTO,
} from '@DTOs/index';

const execFileAsync = promisify(execFile);

// Type aliases for backward compatibility
export type DirectRhinoLaunchResponse = DirectRhinoLaunchResponseDTO;
export type SystemRhinoInfo = SystemRhinoInfoDTO;

@Injectable()
export class RhinoDirectService {
  private readonly commonRhinoPaths = [
    'C:\\Program Files\\Rhino 8\\System\\Rhino.exe',
    'C:\\Program Files\\Rhino 7\\System\\Rhino.exe',
    'C:\\Program Files (x86)\\Rhino 8\\System\\Rhino.exe',
    'C:\\Program Files (x86)\\Rhino 7\\System\\Rhino.exe',
  ];

  constructor() {
    console.log('🚀 Direct Rhino Service initialized');
  }

  /**
   * Startet Rhino mit der angegebenen Grasshopper-Datei
   */
  async launchRhino(request: DirectRhinoLaunchRequest): Promise<DirectRhinoLaunchResponse> {
    console.log('🦏 Starting Rhino launch process:', request);

    // Validiere Dateipfad
    if (!fs.existsSync(request.filePath)) {
      throw new Error(`Grasshopper-Datei nicht gefunden: ${request.filePath}`);
    }

    // Ermittle Rhino-Pfad
    let rhinoPath = request.rhinoPath;
    let executionMethod: 'direct' | 'registry' | 'fallback' = 'direct';

    if (!rhinoPath) {
      console.log('🔍 No Rhino path provided, searching for installation...');
      const systemInfo = await this.getSystemRhinoInfo();

      if (systemInfo.defaultPath) {
        rhinoPath = systemInfo.defaultPath;
        executionMethod = 'registry';
        console.log('✅ Found Rhino via registry:', rhinoPath);
      } else if (systemInfo.installations.length > 0) {
        rhinoPath = systemInfo.installations[0].path;
        executionMethod = 'fallback';
        console.log('✅ Found Rhino via fallback search:', rhinoPath);
      } else {
        throw new Error('Rhino-Installation nicht gefunden. Bitte Pfad manuell angeben.');
      }
    }

    // Validiere Rhino-Pfad
    if (!fs.existsSync(rhinoPath)) {
      throw new Error(`Rhino-Executable nicht gefunden: ${rhinoPath}`);
    }

    // Erstelle Rhino-Befehl
    const command = this.buildRhinoCommand(request.filePath, request);
    console.log('🔧 Built Rhino command:', command);

    try {
      // Starte Rhino-Prozess
      const processId = await this.executeRhinoProcess(rhinoPath, command);

      return {
        success: true,
        message: 'Rhino erfolgreich gestartet',
        processId,
        commandUsed: `"${rhinoPath}" ${command}`,
        rhinoPath,
        executionMethod,
      };
    } catch (error) {
      console.error('❌ Rhino process execution failed:', error);
      throw new Error(`Rhino-Prozess konnte nicht gestartet werden: ${error.message}`);
    }
  }

  /**
   * Ermittelt verfügbare Rhino-Installationen
   */
  async getSystemRhinoInfo(): Promise<SystemRhinoInfo> {
    console.log('🔍 Gathering system Rhino information...');

    const installations: RhinoInstallation[] = [];
    let defaultPath: string | undefined;
    let registryAvailable = false;

    try {
      // Versuche Registry-Abfrage (Windows)
      if (process.platform === 'win32') {
        const registryInstallations = await this.findRhinoViaRegistry();
        installations.push(...registryInstallations);
        registryAvailable = true;

        if (registryInstallations.length > 0) {
          defaultPath =
            registryInstallations.find(r => r.isDefault).path || registryInstallations[0].path;
        }
      }
    } catch (error) {
      console.warn('⚠️ Registry search failed:', error.message);
    }

    // Fallback: Suche in Standard-Pfaden
    for (const commonPath of this.commonRhinoPaths) {
      if (fs.existsSync(commonPath)) {
        const version = this.extractVersionFromPath(commonPath);
        const existing = installations.find(r => r.path === commonPath);

        if (!existing) {
          installations.push({
            version,
            path: commonPath,
            isDefault: !defaultPath,
          });

          if (!defaultPath) {
            defaultPath = commonPath;
          }
        }
      }
    }

    console.log('✅ System Rhino info gathered:', {
      installations: installations.length,
      defaultPath,
    });

    return {
      installations,
      defaultPath,
      registryAvailable,
    };
  }

  /**
   * Testet ob Rhino verfügbar ist
   */
  async testRhinoAvailability(): Promise<boolean> {
    try {
      const systemInfo = await this.getSystemRhinoInfo();
      return systemInfo.installations.length > 0;
    } catch (error) {
      console.error('❌ Rhino availability test failed:', error);
      return false;
    }
  }

  /**
   * Sucht Rhino-Installationen über Windows Registry
   */
  private async findRhinoViaRegistry(): Promise<RhinoInstallation[]> {
    const installations: RhinoInstallation[] = [];

    try {
      // Suche nach Rhino 8
      const rhino8Path = await this.queryRegistry(
        'HKEY_LOCAL_MACHINE\\SOFTWARE\\McNeel\\Rhinoceros\\8.0\\Install',
        'Path',
      );
      if (rhino8Path) {
        const execPath = path.join(rhino8Path, 'System', 'Rhino.exe');
        if (fs.existsSync(execPath)) {
          installations.push({
            version: '8.0',
            path: execPath,
            isDefault: true,
          });
        }
      }

      // Suche nach Rhino 7
      const rhino7Path = await this.queryRegistry(
        'HKEY_LOCAL_MACHINE\\SOFTWARE\\McNeel\\Rhinoceros\\7.0\\Install',
        'Path',
      );
      if (rhino7Path) {
        const execPath = path.join(rhino7Path, 'System', 'Rhino.exe');
        if (fs.existsSync(execPath)) {
          installations.push({
            version: '7.0',
            path: execPath,
            isDefault: installations.length === 0,
          });
        }
      }
    } catch (error) {
      console.warn('⚠️ Registry query failed:', error.message);
    }

    return installations;
  }

  /**
   * Führt Registry-Abfrage aus
   * Uses execFile for security (no shell injection possible)
   */
  private async queryRegistry(keyPath: string, valueName: string): Promise<string | null> {
    try {
      // Use execFile instead of exec to avoid shell injection and deprecation warning
      const { stdout } = await execFileAsync('reg', ['query', keyPath, '/v', valueName], {
        windowsHide: true,
      });

      const lines = stdout.split('\n');
      for (const line of lines) {
        if (line.includes(valueName)) {
          const parts = line.trim().split(/\s+/);
          if (parts.length >= 3) {
            return parts.slice(2).join(' ').trim();
          }
        }
      }
    } catch (error) {
      // Registry-Schlüssel nicht gefunden oder Zugriff verweigert
    }

    return null;
  }

  /**
   * Extrahiert Versionsnummer aus Dateipfad
   */
  private extractVersionFromPath(filePath: string): string {
    const match = filePath.match(/Rhino\s+(\d+)/i);
    return match ? match[1] + '.0' : 'Unknown';
  }

  /**
   * Erstellt Rhino-Befehlszeile für Grasshopper
   */
  private buildRhinoCommand(filePath: string, options: DirectRhinoLaunchRequest): string {
    const commands = [];

    // Grasshopper-Befehlssequenz
    commands.push('_-Grasshopper');

    if (options.batchMode !== false) {
      commands.push('B', 'D', 'W', 'L');
    }

    commands.push('W', 'H', 'D', 'O');
    commands.push(`"${filePath}"`);
    commands.push('W', 'H');

    if (options.showViewport !== false) {
      commands.push('_MaxViewport');
    }

    commands.push('_Enter');

    const commandString = commands.join(' ');
    console.log('🔧 Built Rhino command:', commandString, 'was successful');
    return `-runscript="${commandString}"`;
  }

  /**
   * Führt Rhino-Prozess aus
   */
  private async executeRhinoProcess(rhinoPath: string, command: string): Promise<number> {
    return new Promise((resolve, reject) => {
      console.log('🚀 Spawning Rhino process:', { rhinoPath, command });

      const process = spawn(rhinoPath, [command], {
        detached: true,
        stdio: 'ignore',
      });

      process.on('spawn', () => {
        console.log('✅ Rhino process spawned successfully, PID:', process.pid);
        process.unref(); // Lasse Prozess im Hintergrund laufen
        resolve(process.pid);
      });

      process.on('error', error => {
        console.error('❌ Rhino process spawn error:', error);
        reject(error);
      });

      // Timeout für Spawn-Vorgang
      setTimeout(() => {
        if (!process.pid) {
          reject(
            new Error('Rhino-Prozess konnte nicht innerhalb von 10 Sekunden gestartet werden'),
          );
        }
      }, 10000);
    });
  }
}
