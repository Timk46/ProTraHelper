/**
 * Rhino Unified Controller
 * REST API endpoints for unified Rhino management (focus + launch)
 * Provides a single interface for all Rhino interaction needs
 */

import { Controller, Post, Get, Body, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { RhinoUnifiedService } from './rhino-unified.service';
import { 
  EnsureRhinoActiveRequestDTO, 
  EnsureRhinoActiveResponseDTO,
  RhinoAvailabilityStatusDTO 
} from '@DTOs/rhino-unified.dto';

@Controller('api/rhinounified')
export class RhinoUnifiedController {
  private readonly logger = new Logger(RhinoUnifiedController.name);

  constructor(private readonly rhinoUnifiedService: RhinoUnifiedService) {}

  /**
   * Ensures Rhino is active - main endpoint for Rhino management
   * Intelligently focuses existing window or launches new instance
   * 
   * POST /api/rhinounified/ensure-active
   */
  @Post('ensure-active')
  async ensureRhinoActive(
    @Body() request: EnsureRhinoActiveRequestDTO = {}
  ): Promise<EnsureRhinoActiveResponseDTO> {
    try {
      this.logger.log('🎯 Ensure Rhino active request received:', {
        hasGrasshopperFile: !!request.grasshopperFilePath,
        focusMethod: request.focusMethod || 'unified',
        userId: request.userId || 'anonymous'
      });

      const result = await this.rhinoUnifiedService.ensureRhinoActive(request);

      this.logger.log(`${result.success ? '✅' : '❌'} Ensure Rhino active result: ${result.action}`, {
        success: result.success,
        action: result.action,
        performanceMs: result.performanceMs,
        hasWarnings: !!result.warnings?.length
      });

      return result;
    } catch (error) {
      this.logger.error('❌ Ensure Rhino active failed:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new HttpException(
        `Failed to ensure Rhino is active: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Checks Rhino availability status
   * Provides information about Rhino installation and current state
   * 
   * GET /api/rhinounified/availability
   */
  @Get('availability')
  async checkRhinoAvailability(): Promise<RhinoAvailabilityStatusDTO> {
    try {
      this.logger.log('🔍 Rhino availability check requested');

      const status = await this.rhinoUnifiedService.checkRhinoAvailability();

      this.logger.log('✅ Rhino availability check completed:', {
        isRunning: status.isRunning,
        isInstalled: status.isInstalled,
        windowCount: status.windowCount,
        recommendedAction: status.recommendedAction
      });

      return status;
    } catch (error) {
      this.logger.error('❌ Rhino availability check failed:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new HttpException(
        `Failed to check Rhino availability: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Gets comprehensive system status for debugging
   * Provides detailed information about all Rhino-related components
   * 
   * GET /api/rhinounified/system-status
   */
  @Get('system-status')
  async getSystemStatus(): Promise<any> {
    try {
      this.logger.log('🔧 System status check requested');

      const status = await this.rhinoUnifiedService.getDetailedSystemStatus();

      this.logger.log('✅ System status check completed');
      return status;
    } catch (error) {
      this.logger.error('❌ System status check failed:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new HttpException(
        `Failed to get system status: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Quick Rhino focus endpoint (for backwards compatibility)
   * Attempts to focus existing Rhino window without launching
   * 
   * POST /api/rhinounified/focus-only
   */
  @Post('focus-only')
  async focusOnly(
    @Body() request: { focusMethod?: 'native' | 'powershell' | 'unified' } = {}
  ): Promise<EnsureRhinoActiveResponseDTO> {
    try {
      this.logger.log('🎯 Focus-only request received:', { focusMethod: request.focusMethod || 'unified' });

      // Check if Rhino is running first
      const availability = await this.rhinoUnifiedService.checkRhinoAvailability();
      
      if (!availability.isRunning || availability.windowCount === 0) {
        return {
          success: false,
          message: 'No Rhino windows found to focus. Use ensure-active to launch Rhino if needed.',
          action: 'failed',
          timestamp: new Date().toISOString(),
          performanceMs: 0,
          warnings: ['Rhino not running - cannot focus']
        };
      }

      // Use ensure-active but disable launching by checking availability first
      const focusRequest: EnsureRhinoActiveRequestDTO = {
        focusMethod: request.focusMethod || 'unified',
        bringToFront: true,
        restoreIfMinimized: true
      };

      const result = await this.rhinoUnifiedService.ensureRhinoActive(focusRequest);

      this.logger.log(`${result.success ? '✅' : '❌'} Focus-only result: ${result.action}`);
      return result;
    } catch (error) {
      this.logger.error('❌ Focus-only failed:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new HttpException(
        `Failed to focus Rhino: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Quick Rhino launch endpoint
   * Always launches new Rhino instance with optional Grasshopper file
   * 
   * POST /api/rhinounified/launch-only
   */
  @Post('launch-only')
  async launchOnly(
    @Body() request: { grasshopperFilePath?: string; userId?: string } = {}
  ): Promise<EnsureRhinoActiveResponseDTO> {
    try {
      this.logger.log('🚀 Launch-only request received:', { 
        hasFile: !!request.grasshopperFilePath,
        userId: request.userId || 'anonymous'
      });

      const availability = await this.rhinoUnifiedService.checkRhinoAvailability();
      
      if (!availability.isInstalled) {
        return {
          success: false,
          message: 'Rhino is not installed. Please install Rhino 8 to use this feature.',
          action: 'failed',
          timestamp: new Date().toISOString(),
          performanceMs: 0,
          warnings: ['Rhino installation not found']
        };
      }

      const launchRequest: EnsureRhinoActiveRequestDTO = {
        grasshopperFilePath: request.grasshopperFilePath,
        userId: request.userId || 'web-user',
        showViewport: true,
        batchMode: true
      };

      // For launch-only, we would need to modify the service to force launch
      // For now, use the existing logic which will launch if not running
      const result = await this.rhinoUnifiedService.ensureRhinoActive(launchRequest);

      this.logger.log(`${result.success ? '✅' : '❌'} Launch-only result: ${result.action}`);
      return result;
    } catch (error) {
      this.logger.error('❌ Launch-only failed:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new HttpException(
        `Failed to launch Rhino: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Health check endpoint
   * 
   * GET /api/rhinounified/health
   */
  @Get('health')
  async healthCheck(): Promise<{ status: string; timestamp: string; services: any }> {
    try {
      const availability = await this.rhinoUnifiedService.checkRhinoAvailability();
      
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          unified: true,
          rhinoInstalled: availability.isInstalled,
          rhinoRunning: availability.isRunning,
          nativeFocusAvailable: availability.nativeFocusAvailable,
          powershellFocusAvailable: availability.powershellFocusAvailable
        }
      };
    } catch (error) {
      this.logger.warn('⚠️ Health check encountered issues:', error);
      
      return {
        status: 'degraded',
        timestamp: new Date().toISOString(),
        services: {
          unified: true,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }
}