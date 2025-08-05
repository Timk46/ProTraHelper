/**
 * Rhino Native Focus Service
 * Implements direct Windows API calls using Koffi for reliable window focusing
 * Provides multiple fallback methods for robust window focus operations
 */

import { Injectable, Logger } from '@nestjs/common';
import { NativeFocusResult, NativeFocusConfig, FocusAttempt } from './windows-api.types';
import { ProcessThreadInfo } from './windows-api.types';
import {
  WindowsErrors,
  TimingConstants,
  FocusMethods,
  DefaultConfig,
} from './windows-api.constants';

@Injectable()
export class RhinoNativeFocusService {
  private readonly logger = new Logger(RhinoNativeFocusService.name);
  private config: NativeFocusConfig;
  private isInitialized: boolean;
  private user32: any;
  private kernel32: any;

  constructor() {
    this.config = {
      maxAttempts: DefaultConfig.MAX_ATTEMPTS,
      attemptDelayMs: DefaultConfig.ATTEMPT_DELAY_MS,
      restoreIfMinimized: DefaultConfig.RESTORE_IF_MINIMIZED,
      bringToFront: DefaultConfig.BRING_TO_FRONT,
      operationTimeoutMs: DefaultConfig.OPERATION_TIMEOUT_MS,
      verboseLogging: DefaultConfig.VERBOSE_LOGGING,
    };

    try {
      this.initializeWinApi();
      this.isInitialized = true;
      this.logger.log('🚀 Rhino Native Focus Service initialized successfully');
    } catch (error) {
      this.logger.error('❌ Failed to initialize Windows API:', error);
      // Don't throw error, just mark as not initialized
      this.isInitialized = false;
    }
  }

  /**
   * Initialize Windows API bindings using Koffi
   */
  private initializeWinApi(): void {
    try {
      // Dynamically import koffi
      const koffi = require('koffi');

      // Load user32.dll and kernel32.dll
      this.user32 = koffi.load('user32.dll');
      this.kernel32 = koffi.load('kernel32.dll');

      // Define function prototypes for window management
      this.user32.SetForegroundWindow = koffi.func('bool SetForegroundWindow(long)');
      this.user32.IsWindow = koffi.func('bool IsWindow(long)');
      this.user32.GetForegroundWindow = koffi.func('long GetForegroundWindow()');
      this.user32.IsWindowVisible = koffi.func('bool IsWindowVisible(long)');
      this.user32.GetWindowTextA = koffi.func('int GetWindowTextA(long, str, int)');
      this.user32.GetWindowTextLengthA = koffi.func('int GetWindowTextLengthA(long)');
      this.user32.GetWindowThreadProcessId = koffi.func(
        'uint GetWindowThreadProcessId(long, uint*)',
      );
      this.user32.EnumWindows = koffi.func('bool EnumWindows(void*, long)');

      this.kernel32.GetLastError = koffi.func('uint GetLastError()');

      this.logger.debug('✅ Windows API functions loaded successfully');
    } catch (error) {
      this.logger.warn('⚠️ Koffi not available, native implementation disabled:', error);
      throw error;
    }
  }

  /**
   * Update service configuration
   */
  updateConfig(config: Partial<NativeFocusConfig>): void {
    this.config = { ...this.config, ...config };
    this.logger.debug('⚙️ Native focus config updated:', this.config);
  }

  /**
   * Get current configuration
   */
  getConfig(): NativeFocusConfig {
    return { ...this.config };
  }

  /**
   * Check if the service is properly initialized
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Focus a window using native Windows API calls (simplified version)
   */
  async focusWindow(windowHandle: string | number): Promise<NativeFocusResult> {
    const startTime = Date.now();
    const hWnd = typeof windowHandle === 'string' ? parseInt(windowHandle) : windowHandle;
    const attemptsLog: FocusAttempt[] = [];

    if (!this.isInitialized) {
      return {
        success: false,
        message: 'Native focus service not initialized - Koffi or Windows API not available',
        attemptsLog,
        performanceMs: Date.now() - startTime,
        windowHandle: windowHandle.toString(),
      };
    }

    this.logger.debug(`🎯 Starting native focus for window handle: ${hWnd}`);

    try {
      // Validate window handle
      const isValidWindow = this.user32.IsWindow(hWnd);
      if (!isValidWindow) {
        return {
          success: false,
          message: `Invalid window handle: ${hWnd}`,
          errorCode: WindowsErrors.ERROR_INVALID_WINDOW_HANDLE,
          attemptsLog,
          performanceMs: Date.now() - startTime,
          windowHandle: windowHandle.toString(),
        };
      }

      // Try to focus the window using SetForegroundWindow
      const attemptStartTime = Date.now();
      const focusResult = this.user32.SetForegroundWindow(hWnd);
      const errorCode = focusResult ? 0 : this.kernel32.GetLastError();

      attemptsLog.push({
        method: FocusMethods.STANDARD_FOCUS,
        success: focusResult === 1, // Convert to boolean
        durationMs: Date.now() - attemptStartTime,
        timestamp: new Date(),
        errorCode: errorCode || undefined,
      });

      const result: NativeFocusResult = {
        success: focusResult === 1,
        message:
          focusResult === 1
            ? 'Window focused successfully using native SetForegroundWindow'
            : `SetForegroundWindow failed with error code: ${errorCode}`,
        errorCode: errorCode || undefined,
        methodUsed: FocusMethods.STANDARD_FOCUS,
        attemptsLog,
        performanceMs: Date.now() - startTime,
        windowHandle: windowHandle.toString(),
      };

      if (this.config.verboseLogging) {
        this.logger.debug(`🏁 Native focus operation completed:`, {
          success: result.success,
          performanceMs: result.performanceMs,
          errorCode: result.errorCode,
        });
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('❌ Native focus operation failed:', error);

      return {
        success: false,
        message: `Native focus failed: ${errorMessage}`,
        attemptsLog,
        performanceMs: Date.now() - startTime,
        windowHandle: windowHandle.toString(),
      };
    }
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Finds Rhino windows using native Windows API calls
   * @returns Array of window information objects
   */
  async findRhinoWindows(): Promise<
    {
      processId: number;
      windowHandle: string;
      windowTitle: string;
      isVisible: boolean;
      isActive: boolean;
    }[]
  > {
    if (!this.isInitialized) {
      this.logger.warn('⚠️ Native focus service not initialized');
      return [];
    }

    try {
      this.logger.debug('🔍 Native Rhino window enumeration started');

      // Since Koffi callback handling is complex, we'll use a process-based approach
      // This requires psutil-like functionality which is not available directly
      // For now, return empty array and let PowerShell handle it
      // TODO: Implement full window enumeration with Koffi callbacks

      this.logger.debug(
        '🔄 Native enumeration not yet fully implemented, falling back to PowerShell',
      );
      return [];
    } catch (error) {
      this.logger.error('❌ Native window enumeration failed:', error);
      return [];
    }
  }

  /**
   * Gets window title for a given window handle
   * @param windowHandle - Window handle as number
   * @returns Window title string or empty string if failed
   */
  getWindowTitle(windowHandle: number): string {
    if (!this.isInitialized) {
      return '';
    }

    try {
      // Get window text length first
      const titleLength = this.user32.GetWindowTextLengthA(windowHandle);
      if (titleLength <= 0) {
        return '';
      }

      // Create buffer for window text
      const buffer = Buffer.alloc(titleLength + 1);
      const actualLength = this.user32.GetWindowTextA(windowHandle, buffer, titleLength + 1);

      if (actualLength > 0) {
        return buffer.toString('ascii', 0, actualLength);
      }

      return '';
    } catch (error) {
      this.logger.warn('⚠️ Failed to get window title:', error);
      return '';
    }
  }

  /**
   * Checks if a window is visible
   * @param windowHandle - Window handle as number
   * @returns True if window is visible
   */
  isWindowVisible(windowHandle: number): boolean {
    if (!this.isInitialized) {
      return false;
    }

    try {
      return this.user32.IsWindowVisible(windowHandle) === 1;
    } catch (error) {
      this.logger.warn('⚠️ Failed to check window visibility:', error);
      return false;
    }
  }

  /**
   * Gets the process ID for a window
   * @param windowHandle - Window handle as number
   * @returns Process ID or 0 if failed
   */
  getWindowProcessId(windowHandle: number): number {
    if (!this.isInitialized) {
      return 0;
    }

    try {
      const processIdBuffer = Buffer.alloc(4);
      this.user32.GetWindowThreadProcessId(windowHandle, processIdBuffer);
      return processIdBuffer.readUInt32LE(0);
    } catch (error) {
      this.logger.warn('⚠️ Failed to get window process ID:', error);
      return 0;
    }
  }

  /**
   * Checks if a window is currently in the foreground
   * @param windowHandle - Window handle as number
   * @returns True if window is active/foreground
   */
  isWindowActive(windowHandle: number): boolean {
    if (!this.isInitialized) {
      return false;
    }

    try {
      const foregroundWindow = this.user32.GetForegroundWindow();
      return foregroundWindow === windowHandle;
    } catch (error) {
      this.logger.warn('⚠️ Failed to check window active state:', error);
      return false;
    }
  }

  /**
   * Get human-readable error message from Windows error code
   */
  getErrorMessage(errorCode: number): string {
    const errorMessages: Record<number, string> = {
      [WindowsErrors.ERROR_SUCCESS]: 'Operation completed successfully',
      [WindowsErrors.ERROR_INVALID_WINDOW_HANDLE]: 'Invalid window handle',
      [WindowsErrors.ERROR_ACCESS_DENIED]: 'Access denied',
      [WindowsErrors.ERROR_INVALID_PARAMETER]: 'Invalid parameter',
      [WindowsErrors.ERROR_TIMEOUT]: 'Operation timed out',
      [WindowsErrors.ERROR_NOT_FOUND]: 'Window not found',
    };

    return errorMessages[errorCode] || `Windows error code: ${errorCode}`;
  }
}
