/**
 * Direct Rhino Controller
 * Direkte Rhino-Ausführung ohne Helper-App Abhängigkeit
 * Nutzt Windows-Prozess-Ausführung und Registry-Erkennung
 */

import { Controller, Post, Get, Body, HttpException, HttpStatus } from '@nestjs/common';
import { DirectRhinoLaunchResponse, SystemRhinoInfo } from './rhino-direct.service';
import {
  RhinoDirectService,
  DirectRhinoLaunchRequest,
  RhinoInstallation,
} from './rhino-direct.service';
import {
  RhinoWindowManagerService,
  RhinoFocusRequest,
  RhinoFocusResponse,
  WindowInfo,
} from './rhino-window-manager.service';

@Controller('api/rhino')
export class RhinoDirectController {
  constructor(
    private readonly rhinoDirectService: RhinoDirectService,
    private readonly rhinoWindowManagerService: RhinoWindowManagerService,
  ) {}

  /**
   * Startet Rhino direkt über Windows-Prozess
   */
  @Post('launch-direct')
  async launchRhinoDirect(
    @Body() request: DirectRhinoLaunchRequest,
  ): Promise<DirectRhinoLaunchResponse> {
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
        HttpStatus.INTERNAL_SERVER_ERROR,
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
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Testet Rhino-Verfügbarkeit
   */
  @Get('test-availability')
  async testRhinoAvailability(): Promise<{
    available: boolean;
    message?: string;
  }> {
    try {
      console.log('🧪 Rhino availability test request received');

      const available = await this.rhinoDirectService.testRhinoAvailability();

      const result = {
        available,
        message: available ? 'Rhino ist verfügbar' : 'Rhino nicht gefunden',
      };

      console.log('✅ Rhino availability test result:', result);
      return result;
    } catch (error) {
      console.error('❌ Rhino availability test failed:', error);

      return {
        available: false,
        message: `Test fehlgeschlagen: ${error.message}`,
      };
    }
  }

  /**
   * Fokussiert ein Rhino-Fenster
   */
  @Post('focus-window')
  async focusRhinoWindow(@Body() request: RhinoFocusRequest): Promise<RhinoFocusResponse> {
    try {
      console.log('🎯 Focus Rhino window request received:', request);

      const result = await this.rhinoWindowManagerService.focusRhinoWindow(request);

      console.log('✅ Focus Rhino window result:', result);
      return result;
    } catch (error) {
      console.error('❌ Focus Rhino window failed:', error);

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        message: `Fehler beim Fokussieren: ${errorMessage}`,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Ermittelt Rhino-Fenster-Informationen
   */
  @Get('window-info')
  async getRhinoWindowInfo(): Promise<WindowInfo[]> {
    try {
      console.log('🔍 Get Rhino window info request received');

      const windows = await this.rhinoWindowManagerService.findRhinoWindows();

      console.log('✅ Rhino window info retrieved:', windows);
      return windows;
    } catch (error) {
      console.error('❌ Get Rhino window info failed:', error);

      throw new HttpException(
        `Fenster-Info Abfrage fehlgeschlagen: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Prüft den Status von Rhino-Fenstern
   */
  @Get('window-status')
  async checkRhinoWindowStatus(): Promise<{
    isActive: boolean;
    windowInfo?: WindowInfo;
    totalWindows: number;
  }> {
    try {
      console.log('🔍 Check Rhino window status request received');

      const status = await this.rhinoWindowManagerService.checkRhinoWindowStatus();

      console.log('✅ Rhino window status retrieved:', status);
      return status;
    } catch (error) {
      console.error('❌ Check Rhino window status failed:', error);

      throw new HttpException(
        `Fenster-Status Abfrage fehlgeschlagen: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Testet die Windows API-Verfügbarkeit
   */
  @Get('test-windows-api')
  async testWindowsApiAvailability(): Promise<{
    available: boolean;
    message: string;
    features: {
      powershell: boolean;
      windowsApi: boolean;
      rhinoDetection: boolean;
    };
  }> {
    try {
      console.log('🧪 Test Windows API availability request received');

      const result = await this.rhinoWindowManagerService.testWindowsApiAvailability();

      console.log('✅ Windows API availability test result:', result);
      return result;
    } catch (error) {
      console.error('❌ Windows API availability test failed:', error);

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        available: false,
        message: `Test fehlgeschlagen: ${errorMessage}`,
        features: {
          powershell: false,
          windowsApi: false,
          rhinoDetection: false,
        },
      };
    }
  }
}
