/**
 * Direct Rhino Controller
 * Direkte Rhino-Ausführung ohne Helper-App Abhängigkeit
 * Nutzt Windows-Prozess-Ausführung und Registry-Erkennung
 */

import { Controller, Post, Get, Body, HttpException, HttpStatus, UseGuards, Req, UsePipes, ValidationPipe } from '@nestjs/common';
import { DirectRhinoLaunchResponse, SystemRhinoInfo } from './rhino-direct.service';
import {
  RhinoDirectService,
  DirectRhinoLaunchRequest,
  RhinoInstallation,
} from './rhino-direct.service';
import { RhinoFocusResponse, WindowInfo } from './rhino-window-manager.service';
import { RhinoWindowManagerService, RhinoFocusRequest } from './rhino-window-manager.service';
import { UnifiedRhinoFocusResponseDTO } from '@DTOs/rhino-window.dto';
import { NativeFocusRequestDTO } from '@DTOs/rhino-window.dto';
import { 
  SecureRhinoLaunchRequestDTO,
  SecureRhinoFocusRequestDTO,
  SecureNativeFocusRequestDTO,
  SecureSystemConfigRequestDTO,
  SecureDebugRequestDTO
} from '@DTOs/rhino-secure.dto';
import { JwtAuthGuard } from '../auth/common/guards/jwt-auth.guard';
import { RolesGuard, roles } from '../auth/common/guards/roles.guard';
import { RhinoThrottleGuard, RhinoThrottle, RhinoRateLimits } from './guards/rhino-throttle.guard';
import { RhinoAuditService } from './services/rhino-audit.service';

interface RequestWithUser {
  user: {
    id: number;
    email: string;
  };
  ip?: string;
  connection?: {
    remoteAddress?: string;
  };
  headers: {
    'user-agent'?: string;
    [key: string]: any;
  };
}

@Controller('api/rhinodirect')
@UseGuards(JwtAuthGuard, RolesGuard, RhinoThrottleGuard)
@UsePipes(new ValidationPipe({ 
  transform: true, 
  whitelist: true, 
  forbidNonWhitelisted: true,
  validateCustomDecorators: true
}))
@roles('STUDENT', 'ARCHSTUDENT', 'TEACHER', 'ADMIN')
export class RhinoDirectController {
  constructor(
    private readonly rhinoDirectService: RhinoDirectService,
    private readonly rhinoWindowManagerService: RhinoWindowManagerService,
    private readonly auditService: RhinoAuditService,
  ) {}

  /**
   * Startet Rhino direkt über Windows-Prozess
   */
  @Post('launch-direct')
  @RhinoThrottle(RhinoRateLimits.LAUNCH)
  async launchRhinoDirect(
    @Body() request: SecureRhinoLaunchRequestDTO,
    @Req() req: RequestWithUser,
  ): Promise<DirectRhinoLaunchResponse> {
    const startTime = Date.now();
    const ipAddress = req.ip || req.connection?.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'];

    try {
      console.log(`🚀 Direct Rhino launch request received from user ${req.user.id} (${req.user.email}):`, request);

      // Validierung der Eingabe
      if (!request.filePath) {
        throw new HttpException('filePath ist erforderlich', HttpStatus.BAD_REQUEST);
      }

      // Führe Rhino-Start aus
      const result = await this.rhinoDirectService.launchRhino(request);

      // Log successful operation
      const responseTime = Date.now() - startTime;
      await this.auditService.logSuccess(
        req.user.id,
        req.user.email,
        'launch',
        '/api/rhinodirect/launch-direct',
        { filePath: request.filePath, rhinoPath: request.rhinoPath },
        ipAddress,
        responseTime,
        userAgent
      );

      console.log('✅ Direct Rhino launch result:', result);
      return result;
    } catch (error) {
      console.error('❌ Direct Rhino launch failed:', error);

      // Log failed operation
      await this.auditService.logError(
        req.user.id,
        req.user.email,
        'launch',
        '/api/rhinodirect/launch-direct',
        { filePath: request.filePath },
        error.message,
        ipAddress,
        userAgent
      );

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
  @RhinoThrottle(RhinoRateLimits.INFO)
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
  async focusRhinoWindow(@Body() request: SecureRhinoFocusRequestDTO): Promise<RhinoFocusResponse> {
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
   * Fokussiert ein Rhino-Fenster mit unified approach (native + PowerShell fallback)
   */
  @Post('focus-window-unified')
  @RhinoThrottle(RhinoRateLimits.FOCUS)
  async focusRhinoWindowUnified(
    @Body() request: SecureRhinoFocusRequestDTO,
    @Req() req: RequestWithUser,
  ): Promise<UnifiedRhinoFocusResponseDTO> {
    try {
      console.log(`🎯 Unified Rhino window focus request received from user ${req.user.id} (${req.user.email}):`, request);

      const result = await this.rhinoWindowManagerService.focusRhinoWindowUnified(request);

      console.log('✅ Unified Rhino window focus result:', result);
      return result;
    } catch (error) {
      console.error('❌ Unified Rhino window focus failed:', error);

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        message: `Unified focus error: ${errorMessage}`,
        implementation: 'error',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Fokussiert ein Rhino-Fenster nur mit der nativen Implementierung
   */
  @Post('focus-window-native')
  async focusRhinoWindowNative(
    @Body() request: SecureNativeFocusRequestDTO,
    @Req() req: RequestWithUser,
  ): Promise<UnifiedRhinoFocusResponseDTO> {
    try {
      console.log(`🚀 Native Rhino window focus request received from user ${req.user.id} (${req.user.email}):`, request);

      const result = await this.rhinoWindowManagerService.focusRhinoWindowNative(
        request.windowHandle,
      );

      console.log('✅ Native Rhino window focus result:', result);
      return result;
    } catch (error) {
      console.error('❌ Native Rhino window focus failed:', error);

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        message: `Native focus error: ${errorMessage}`,
        implementation: 'error',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Aktiviert/Deaktiviert die native Implementierung als Standard
   * Nur für Administratoren verfügbar
   */
  @Post('set-native-default')
  @roles('ADMIN')
  @RhinoThrottle(RhinoRateLimits.CONFIG)
  async setNativeAsDefault(@Body() request: SecureSystemConfigRequestDTO): Promise<{
    success: boolean;
    message: string;
    nativeEnabled: boolean;
    nativeAvailable: boolean;
  }> {
    try {
      console.log('⚙️ Set native as default request received:', request);

      this.rhinoWindowManagerService.setUseNativeByDefault(request.enabled);
      const isAvailable = this.rhinoWindowManagerService.isNativeImplementationReady();

      const result = {
        success: true,
        message: `Native implementation ${request.enabled ? 'enabled' : 'disabled'} as default`,
        nativeEnabled: request.enabled,
        nativeAvailable: isAvailable,
      };

      console.log('✅ Set native as default result:', result);
      return result;
    } catch (error) {
      console.error('❌ Set native as default failed:', error);

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        message: `Configuration error: ${errorMessage}`,
        nativeEnabled: false,
        nativeAvailable: false,
      };
    }
  }

  /**
   * Prüft den Status der nativen Implementierung
   */
  @Get('native-status')
  async getNativeImplementationStatus(): Promise<{
    available: boolean;
    enabled: boolean;
    message: string;
    details?: {
      koffiLoaded: boolean;
      winApiInitialized: boolean;
    };
  }> {
    try {
      console.log('📊 Native implementation status request received');

      const isAvailable = this.rhinoWindowManagerService.isNativeImplementationReady();

      const result = {
        available: isAvailable,
        enabled: true, // This would need to be tracked in the service
        message: isAvailable
          ? 'Native implementation ready'
          : 'Native implementation not available',
        details: {
          koffiLoaded: isAvailable,
          winApiInitialized: isAvailable,
        },
      };

      console.log('✅ Native implementation status result:', result);
      return result;
    } catch (error) {
      console.error('❌ Native implementation status failed:', error);

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        available: false,
        enabled: false,
        message: `Status check failed: ${errorMessage}`,
      };
    }
  }

  /**
   * Debug-Endpunkt für Live-Diagnostik der Rhino-Erkennung
   * Nur für Administratoren verfügbar
   */
  @Post('debug-rhino-detection')
  @roles('ADMIN')
  @RhinoThrottle(RhinoRateLimits.DEBUG)
  async debugRhinoDetection(@Body() request: SecureDebugRequestDTO = {}): Promise<any> {
    try {
      console.log('🔧 Debug Rhino detection request received');

      const debugResult = await this.rhinoWindowManagerService.debugRhinoDetection();

      console.log('✅ Debug Rhino detection completed:', debugResult.summary);
      return debugResult;
    } catch (error) {
      console.error('❌ Debug Rhino detection failed:', error);

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        timestamp: new Date().toISOString(),
        methods: {
          native: { available: false, result: [], performanceMs: 0, error: errorMessage },
          base64PowerShell: { available: false, result: [], performanceMs: 0, error: errorMessage },
          simplifiedPowerShell: {
            available: false,
            result: [],
            performanceMs: 0,
            error: errorMessage,
          },
        },
        summary: {
          totalWindowsFound: 0,
          recommendedMethod: 'none',
          issueDiagnosis: [`Debug process failed: ${errorMessage}`],
        },
      };
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
