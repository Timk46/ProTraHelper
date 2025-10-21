/**
 * Rhino Unified Service
 * Combines window focusing and application launching in one intelligent service
 * Provides a seamless user experience by automatically determining whether to focus or launch Rhino
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  RhinoWindowManagerService,
  RhinoFocusRequest,
} from '../rhino-direct/rhino-window-manager.service';
import { BatScriptGeneratorService } from '../bat-rhino/bat-script-generator.service';
import {
  EnsureRhinoActiveRequestDTO,
  EnsureRhinoActiveResponseDTO,
  RhinoAvailabilityStatusDTO,
} from '@DTOs/rhino-unified.dto';
import { BatScriptRequest } from '@DTOs/bat-rhino.dto';

@Injectable()
export class RhinoUnifiedService {
  private readonly logger = new Logger(RhinoUnifiedService.name);

  constructor(
    private readonly rhinoWindowManagerService: RhinoWindowManagerService,
    private readonly batScriptGeneratorService: BatScriptGeneratorService,
  ) {
    this.logger.log('🎯 Rhino Unified Service initialized');
  }

  /**
   * Ensures Rhino is active - either by focusing existing window or launching new instance
   * This is the main method that provides intelligent Rhino management
   *
   * @param request - Configuration for the ensure operation
   * @returns Result of the ensure operation
   */
  async ensureRhinoActive(
    request: EnsureRhinoActiveRequestDTO = {},
  ): Promise<EnsureRhinoActiveResponseDTO> {
    const startTime = Date.now();
    const warnings: string[] = [];

    this.logger.log('🎯 Starting ensure Rhino active operation:', {
      hasGrasshopperFile: !!request.grasshopperFilePath,
      focusMethod: request.focusMethod || 'unified',
    });

    try {
      // Step 1: Check current Rhino status
      const availabilityStatus = await this.checkRhinoAvailability();

      if (availabilityStatus.isRunning && availabilityStatus.windowCount > 0) {
        // Rhino is already running - try to focus it
        this.logger.log('✅ Rhino is already running, attempting to focus existing window');
        return await this.focusExistingRhino(request, startTime, availabilityStatus, warnings);
      } else {
        // Rhino is not running or no windows found - launch it
        this.logger.log('🚀 Rhino not running, launching new instance');
        return await this.launchNewRhino(request, startTime, availabilityStatus, warnings);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('❌ Ensure Rhino active operation failed:', error);

      return {
        success: false,
        message: `Failed to ensure Rhino is active: ${errorMessage}`,
        action: 'failed',
        timestamp: new Date().toISOString(),
        performanceMs: Date.now() - startTime,
        warnings: [errorMessage],
      };
    }
  }

  /**
   * Checks the current availability status of Rhino
   *
   * @returns Detailed status information about Rhino
   */
  async checkRhinoAvailability(): Promise<RhinoAvailabilityStatusDTO> {
    const startTime = Date.now();

    try {
      // Check if Rhino is currently running
      const windowStatus = await this.rhinoWindowManagerService.checkRhinoWindowStatus();
      const rhinoWindows = await this.rhinoWindowManagerService.findRhinoWindows();

      // Check if Rhino is installed
      const detectedRhinoPath = await this.batScriptGeneratorService.detectRhinoPath();
      const isInstalled = !!detectedRhinoPath;

      // Check available focus methods
      const nativeFocusAvailable = this.rhinoWindowManagerService.isNativeImplementationReady();
      const winApiTest = await this.rhinoWindowManagerService.testWindowsApiAvailability();

      // Determine recommended action
      let recommendedAction: 'focus' | 'launch' | 'install' | 'unknown' = 'unknown';

      if (!isInstalled) {
        recommendedAction = 'install';
      } else if (windowStatus.isActive || windowStatus.totalWindows > 0) {
        recommendedAction = 'focus';
      } else {
        recommendedAction = 'launch';
      }

      const installations = [];
      if (detectedRhinoPath) {
        const validation = await this.batScriptGeneratorService.validateRhinoPath(
          detectedRhinoPath,
        );
        installations.push({
          path: detectedRhinoPath,
          version: validation.version || 'Unknown',
          isValid: validation.isValid,
        });
      }

      return {
        isRunning: windowStatus.totalWindows > 0,
        isInstalled,
        windowCount: windowStatus.totalWindows,
        installations,
        nativeFocusAvailable,
        powershellFocusAvailable: winApiTest.features.powershell,
        recommendedAction,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('❌ Failed to check Rhino availability:', error);

      return {
        isRunning: false,
        isInstalled: false,
        windowCount: 0,
        installations: [],
        nativeFocusAvailable: false,
        powershellFocusAvailable: false,
        recommendedAction: 'unknown',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Focuses existing Rhino window
   *
   * @private
   */
  private async focusExistingRhino(
    request: EnsureRhinoActiveRequestDTO,
    startTime: number,
    availabilityStatus: RhinoAvailabilityStatusDTO,
    warnings: string[],
  ): Promise<EnsureRhinoActiveResponseDTO> {
    const focusRequest: RhinoFocusRequest = {
      bringToFront: request.bringToFront !== false,
      restoreIfMinimized: request.restoreIfMinimized !== false,
    };

    try {
      // Use the preferred focus method
      let focusResult;
      let focusMethod: 'native' | 'powershell' | 'unified' = 'unified';

      if (request.focusMethod === 'native' && availabilityStatus.nativeFocusAvailable) {
        // Try native focus only
        const windows = await this.rhinoWindowManagerService.findRhinoWindows();
        if (windows.length > 0) {
          focusResult = await this.rhinoWindowManagerService.focusRhinoWindowNative(
            windows[0].windowHandle,
          );
          focusMethod = 'native';
        } else {
          throw new Error('No Rhino windows found for native focus');
        }
      } else if (request.focusMethod === 'powershell') {
        // Try PowerShell focus only
        focusResult = await this.rhinoWindowManagerService.focusRhinoWindow(focusRequest);
        focusMethod = 'powershell';
      } else {
        // Use unified approach (default)
        focusResult = await this.rhinoWindowManagerService.focusRhinoWindowUnified(focusRequest);
        focusMethod = 'unified';
      }

      if (focusResult.success) {
        // Successful focus
        this.logger.log(`✅ Successfully focused Rhino window using ${focusMethod} method`);

        return {
          success: true,
          message: `Rhino window focused successfully using ${focusMethod} method`,
          action: 'focused',
          windowInfo: 'windowInfo' in focusResult ? focusResult.windowInfo : undefined,
          focusInfo: {
            method: focusMethod,
            attempts: 1,
            performanceMs: Date.now() - startTime,
            windowsFound: availabilityStatus.windowCount,
          },
          timestamp: new Date().toISOString(),
          performanceMs: Date.now() - startTime,
          warnings: warnings.length > 0 ? warnings : undefined,
        };
      } else {
        // Focus failed - fallback to launching
        warnings.push(`Focus attempt failed: ${focusResult.message}`);
        this.logger.warn('⚠️ Focus failed, falling back to launch');

        return await this.launchNewRhino(request, startTime, availabilityStatus, warnings);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      warnings.push(`Focus error: ${errorMessage}`);
      this.logger.warn('⚠️ Focus threw error, falling back to launch:', error);

      return await this.launchNewRhino(request, startTime, availabilityStatus, warnings);
    }
  }

  /**
   * Launches new Rhino instance
   *
   * @private
   */
  private async launchNewRhino(
    request: EnsureRhinoActiveRequestDTO,
    startTime: number,
    availabilityStatus: RhinoAvailabilityStatusDTO,
    warnings: string[],
  ): Promise<EnsureRhinoActiveResponseDTO> {
    if (!availabilityStatus.isInstalled) {
      return {
        success: false,
        message: 'Rhino is not installed. Please install Rhino 8 to use this feature.',
        action: 'failed',
        timestamp: new Date().toISOString(),
        performanceMs: Date.now() - startTime,
        warnings: ['Rhino installation not found'],
      };
    }

    try {
      // Prepare bat script request
      const grasshopperFile =
        request.grasshopperFilePath || 'C:\\Dev\\hefl\\files\\Grasshopper\\example2.gh';

      const batRequest: BatScriptRequest = {
        filePath: grasshopperFile,
        command: `_-Grasshopper B D W L W H D O "${grasshopperFile}" W _MaxViewport _Enter`,
        rhinoPath: request.rhinoPath, // Let service auto-detect if not provided
        batchMode: request.batchMode !== false,
        showViewport: request.showViewport !== false,
        userId: request.userId || 'web-user',
      };

      // Execute Rhino directly
      const launchResult = await this.batScriptGeneratorService.executeRhinoDirectly(batRequest);

      if (launchResult.success) {
        this.logger.log('✅ Successfully launched new Rhino instance');

        // Try to get window info for the new instance (with retry)
        let windowInfo = undefined;
        try {
          // Wait a bit for Rhino to start up
          await this.sleep(2000);
          const windows = await this.rhinoWindowManagerService.findRhinoWindows();
          windowInfo = windows.length > 0 ? windows[0] : undefined;
        } catch (windowError) {
          warnings.push('Could not retrieve window info for launched Rhino instance');
        }

        return {
          success: true,
          message: 'Rhino launched successfully with Grasshopper file',
          action: 'launched',
          windowInfo,
          launchInfo: {
            processId: parseInt(launchResult.executionId || '0') || 0,
            rhinoPath: launchResult.rhinoPath || 'Auto-detected',
            grasshopperFile: request.grasshopperFilePath,
            executionTimeMs: Date.now() - startTime,
          },
          timestamp: new Date().toISOString(),
          performanceMs: Date.now() - startTime,
          warnings: warnings.length > 0 ? warnings : undefined,
        };
      } else {
        // Launch failed
        return {
          success: false,
          message: `Failed to launch Rhino: ${launchResult.message}`,
          action: 'failed',
          timestamp: new Date().toISOString(),
          performanceMs: Date.now() - startTime,
          warnings: warnings.concat([launchResult.message]),
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('❌ Failed to launch Rhino:', error);

      return {
        success: false,
        message: `Launch error: ${errorMessage}`,
        action: 'failed',
        timestamp: new Date().toISOString(),
        performanceMs: Date.now() - startTime,
        warnings: warnings.concat([errorMessage]),
      };
    }
  }

  /**
   * Sleep for specified milliseconds
   *
   * @private
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Gets detailed system status for debugging
   *
   * @returns Comprehensive system status
   */
  async getDetailedSystemStatus(): Promise<{
    availability: RhinoAvailabilityStatusDTO;
    windowManager: {
      nativeAvailable: boolean;
      powershellAvailable: boolean;
      windowsFound: number;
    };
    batScript: {
      rhinoDetected: boolean;
      rhinoPath?: string;
      canExecute: boolean;
    };
    timestamp: string;
  }> {
    const availability = await this.checkRhinoAvailability();
    const windows = await this.rhinoWindowManagerService.findRhinoWindows();
    const winApiTest = await this.rhinoWindowManagerService.testWindowsApiAvailability();
    const rhinoPath = await this.batScriptGeneratorService.detectRhinoPath();

    return {
      availability,
      windowManager: {
        nativeAvailable: this.rhinoWindowManagerService.isNativeImplementationReady(),
        powershellAvailable: winApiTest.available,
        windowsFound: windows.length,
      },
      batScript: {
        rhinoDetected: !!rhinoPath,
        rhinoPath,
        canExecute: !!rhinoPath && winApiTest.available,
      },
      timestamp: new Date().toISOString(),
    };
  }
}
