/**
 * Direct Rhino Controller
 * Direkte Rhino-Ausführung ohne Helper-App Abhängigkeit
 * Nutzt Windows-Prozess-Ausführung und Registry-Erkennung
 */

import { Controller, Post, Get, Body, HttpException, HttpStatus } from '@nestjs/common';
import { RhinoDirectService } from './rhino-direct.service';

export interface DirectRhinoLaunchRequest {
  filePath: string;
  rhinoPath?: string;
  showViewport?: boolean;
  batchMode?: boolean;
}

export interface DirectRhinoLaunchResponse {
  success: boolean;
  message: string;
  processId?: number;
  commandUsed?: string;
  rhinoPath?: string;
  executionMethod: 'direct' | 'registry' | 'fallback';
}

export interface RhinoInstallation {
  version: string;
  path: string;
  isDefault: boolean;
}

export interface SystemRhinoInfo {
  installations: RhinoInstallation[];
  defaultPath?: string;
  registryAvailable: boolean;
}

@Controller('api/rhino')
export class RhinoDirectController {
  constructor(private readonly rhinoDirectService: RhinoDirectService) {}

  /**
   * Startet Rhino direkt über Windows-Prozess
   */
  @Post('launch-direct')
  async launchRhinoDirect(@Body() request: DirectRhinoLaunchRequest): Promise<DirectRhinoLaunchResponse> {
    try {
      console.log('🚀 Direct Rhino launch request received:', request);

      // Validierung der Eingabe
      if (!request.filePath) {
        throw new HttpException('filePath ist erforderlich', HttpStatus.BAD_REQUEST);
      }

      // Führe Rhino-Start aus
      const result = await this.rhinoDirectService.launchRhino(request);

      console.log('✅ Direct Rhino launch result:', result);
      return result;

    } catch (error) {
      console.error('❌ Direct Rhino launch failed:', error);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        `Rhino-Start fehlgeschlagen: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Ermittelt verfügbare Rhino-Installationen
   */
  @Get('system-info')
  async getSystemRhinoInfo(): Promise<SystemRhinoInfo> {
    try {
      console.log('🔍 System Rhino info request received');

      const info = await this.rhinoDirectService.getSystemRhinoInfo();

      console.log('✅ System Rhino info retrieved:', info);
      return info;

    } catch (error) {
      console.error('❌ System Rhino info failed:', error);

      throw new HttpException(
        `System-Info Abfrage fehlgeschlagen: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Testet Rhino-Verfügbarkeit
   */
  @Get('test-availability')
  async testRhinoAvailability(): Promise<{ available: boolean; message?: string }> {
    try {
      console.log('🧪 Rhino availability test request received');

      const available = await this.rhinoDirectService.testRhinoAvailability();

      const result = {
        available,
        message: available ? 'Rhino ist verfügbar' : 'Rhino nicht gefunden'
      };

      console.log('✅ Rhino availability test result:', result);
      return result;

    } catch (error) {
      console.error('❌ Rhino availability test failed:', error);

      return {
        available: false,
        message: `Test fehlgeschlagen: ${error.message}`
      };
    }
  }
}
