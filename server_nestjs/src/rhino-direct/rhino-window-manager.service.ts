/**
 * Rhino Window Manager Service
 * Verwaltet Windows-Fenster-Operationen für Rhino 8 Integration
 * Verwendet Windows PowerShell-Befehle für Fenster-Management
 */

import { Injectable, Logger } from '@nestjs/common';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { RhinoNativeFocusService } from './rhino-native-focus.service';
import { UnifiedRhinoFocusResponseDTO } from '@DTOs/rhino-window.dto';

const execFileAsync = promisify(execFile);

export interface WindowInfo {
  processId: number;
  windowHandle: string;
  windowTitle: string;
  isVisible: boolean;
  isActive: boolean;
  position?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface RhinoFocusRequest {
  processId?: number;
  windowTitle?: string;
  bringToFront?: boolean;
  restoreIfMinimized?: boolean;
}

export interface RhinoFocusResponse {
  success: boolean;
  message: string;
  windowInfo?: WindowInfo;
  timestamp: string;
}

@Injectable()
export class RhinoWindowManagerService {
  private readonly logger = new Logger(RhinoWindowManagerService.name);
  private useNativeByDefault = false; // Feature flag for native implementation

  constructor(private readonly rhinoNativeFocusService: RhinoNativeFocusService) {
    this.logger.log('🪟 Rhino Window Manager Service initialized');

    // Check if native implementation is available
    if (this.rhinoNativeFocusService.isReady()) {
      this.logger.log('✅ Native focus implementation available');
    } else {
      this.logger.warn('⚠️ Native focus implementation not available, using PowerShell fallback');
    }
  }

  /**
   * Findet alle Rhino-Fenster im System mit robuster drei-stufiger Erkennung
   * @returns Array von WindowInfo-Objekten
   */
  async findRhinoWindows(): Promise<WindowInfo[]> {
    this.logger.debug('🔍 Starting robust Rhino window detection...');

    // Method 1: Try native Koffi-based detection (fastest)
    if (this.rhinoNativeFocusService.isReady()) {
      try {
        const nativeResult = await this.findRhinoWindowsNative();
        if (nativeResult.length > 0) {
          this.logger.debug(`✅ Native detection found ${nativeResult.length} Rhino windows`);
          return nativeResult;
        }
      } catch (error) {
        this.logger.warn('⚠️ Native detection failed, falling back to PowerShell:', error);
      }
    }

    // Method 2: Try base64-encoded PowerShell (robust)
    try {
      const powershellResult = await this.findRhinoWindowsWithBase64PowerShell();
      if (powershellResult.length > 0) {
        this.logger.debug(`✅ Base64 PowerShell found ${powershellResult.length} Rhino windows`);
        return powershellResult;
      }
    } catch (error) {
      this.logger.warn('⚠️ Base64 PowerShell detection failed, trying simplified approach:', error);
    }

    // Method 3: Try simplified PowerShell (fallback)
    try {
      const simplifiedResult = await this.findRhinoWindowsWithSimplifiedPowerShell();
      this.logger.debug(`✅ Simplified PowerShell found ${simplifiedResult.length} Rhino windows`);
      return simplifiedResult;
    } catch (error) {
      this.logger.error('❌ All detection methods failed:', error);
      return [];
    }
  }

  /**
   * Native Koffi-basierte Rhino-Fenster-Erkennung
   */
  private async findRhinoWindowsNative(): Promise<WindowInfo[]> {
    this.logger.debug('🚀 Attempting native window enumeration...');

    try {
      const nativeWindows = await this.rhinoNativeFocusService.findRhinoWindows();
      return nativeWindows.map(win => ({
        processId: win.processId,
        windowHandle: win.windowHandle,
        windowTitle: win.windowTitle,
        isVisible: win.isVisible,
        isActive: win.isActive,
      }));
    } catch (error) {
      this.logger.warn('⚠️ Native window enumeration failed:', error);
      return [];
    }
  }

  /**
   * Base64-kodierte PowerShell-Erkennung (robuste Hauptmethode)
   */
  private async findRhinoWindowsWithBase64PowerShell(): Promise<WindowInfo[]> {
    this.logger.debug('🔧 Using base64-encoded PowerShell detection...');

    // Enhanced PowerShell script with proper error handling
    const powershellScript = `
      try {
        # Define Win32 API functions once, outside the loop
        Add-Type -TypeDefinition @'
          using System;
          using System.Runtime.InteropServices;
          
          public class Win32WindowAPI {
            [DllImport("user32.dll")]
            public static extern IntPtr GetForegroundWindow();
            
            [DllImport("user32.dll")]
            public static extern bool IsWindow(IntPtr hWnd);
            
            [DllImport("user32.dll")]
            public static extern bool IsWindowVisible(IntPtr hWnd);
          }
'@ -ErrorAction SilentlyContinue

        # Get all Rhino processes with enhanced pattern matching
        $rhinoProcesses = Get-Process -Name "Rhino*" -ErrorAction SilentlyContinue
        
        if (-not $rhinoProcesses) {
          Write-Output "[]"
          exit 0
        }

        $foregroundWindow = [Win32WindowAPI]::GetForegroundWindow()
        $windowsArray = @()

        foreach ($process in $rhinoProcesses) {
          try {
            # Skip processes without main window
            if ($process.MainWindowHandle -eq [IntPtr]::Zero -or [string]::IsNullOrEmpty($process.MainWindowTitle)) {
              continue
            }

            # Validate window handle
            if (-not [Win32WindowAPI]::IsWindow($process.MainWindowHandle)) {
              continue
            }

            # Create window info object
            $windowInfo = @{
              ProcessId = $process.Id
              WindowTitle = $process.MainWindowTitle
              WindowHandle = $process.MainWindowHandle.ToString()
              IsVisible = [Win32WindowAPI]::IsWindowVisible($process.MainWindowHandle)
              IsActive = ($foregroundWindow -eq $process.MainWindowHandle)
            }

            $windowsArray += $windowInfo
          } catch {
            # Continue with next process if this one fails
            continue
          }
        }

        # Output as JSON array
        if ($windowsArray.Count -gt 0) {
          $windowsArray | ConvertTo-Json -Compress -Depth 3
        } else {
          Write-Output "[]"
        }
      } catch {
        Write-Error "PowerShell script execution failed: $_"
        Write-Output "[]"
      }
    `;

    try {
      // Use Base64 encoding to avoid all escaping issues
      const encodedScript = Buffer.from(powershellScript, 'utf-8').toString('base64');

      // Use execFile for security (no shell injection) and to avoid deprecation warning
      const { stdout, stderr } = await execFileAsync(
        'powershell',
        ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', encodedScript],
        {
          timeout: 10000, // 10 second timeout
          encoding: 'utf8',
          windowsHide: true,
        },
      );

      this.logger.debug('📋 PowerShell stdout:', stdout);
      if (stderr) {
        this.logger.warn('⚠️ PowerShell stderr:', stderr);
      }

      if (!stdout.trim()) {
        this.logger.debug('📋 PowerShell returned empty output - no Rhino processes found');
        return [];
      }

      // Parse JSON output
      try {
        const jsonOutput = stdout.trim();
        let windowsData;

        // Handle both single object and array outputs
        if (jsonOutput === '[]') {
          return [];
        } else if (jsonOutput.startsWith('[')) {
          windowsData = JSON.parse(jsonOutput);
        } else {
          // Single object, wrap in array
          windowsData = [JSON.parse(jsonOutput)];
        }

        const windows: WindowInfo[] = [];

        for (const windowData of windowsData) {
          windows.push({
            processId: windowData.ProcessId,
            windowHandle: windowData.WindowHandle,
            windowTitle: windowData.WindowTitle,
            isVisible: windowData.IsVisible,
            isActive: windowData.IsActive,
          });
        }

        return windows;
      } catch (parseError) {
        this.logger.error('❌ Failed to parse PowerShell JSON output:', parseError);
        this.logger.debug('📋 Raw output was:', stdout);
        return [];
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('❌ Base64 PowerShell execution failed:', errorMessage);
      throw error;
    }
  }

  /**
   * Vereinfachte PowerShell-Erkennung (Fallback)
   */
  private async findRhinoWindowsWithSimplifiedPowerShell(): Promise<WindowInfo[]> {
    this.logger.debug('🔄 Using simplified PowerShell detection as fallback...');

    // Minimal PowerShell script without Win32 API calls
    const simpleScript = `
      try {
        Get-Process -Name "Rhino*" -ErrorAction SilentlyContinue | 
        Where-Object { $_.MainWindowTitle -ne "" -and $_.MainWindowHandle -ne 0 } |
        ForEach-Object {
          @{
            ProcessId = $_.Id
            WindowTitle = $_.MainWindowTitle
            WindowHandle = $_.MainWindowHandle.ToString()
            IsVisible = $true
            IsActive = $false
          } | ConvertTo-Json -Compress
        }
      } catch {
        Write-Output ""
      }
    `;

    try {
      const encodedScript = Buffer.from(simpleScript, 'utf-8').toString('base64');

      // Use execFile for security and to avoid deprecation warning
      const { stdout, stderr } = await execFileAsync(
        'powershell',
        ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', encodedScript],
        {
          timeout: 5000,
          encoding: 'utf8',
          windowsHide: true,
        },
      );

      if (stderr) {
        this.logger.warn('⚠️ Simplified PowerShell stderr:', stderr);
      }

      if (!stdout.trim()) {
        return [];
      }

      // Parse line-by-line JSON output
      const lines = stdout
        .trim()
        .split('\n')
        .map(line => line.trim())
        .filter(line => line);

      const windows: WindowInfo[] = [];

      for (const line of lines) {
        try {
          const windowData = JSON.parse(line);
          windows.push({
            processId: windowData.ProcessId,
            windowHandle: windowData.WindowHandle,
            windowTitle: windowData.WindowTitle,
            isVisible: windowData.IsVisible,
            isActive: windowData.IsActive,
          });
        } catch (parseError) {
          this.logger.warn('⚠️ Failed to parse line:', line, parseError);
          continue;
        }
      }

      return windows;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('❌ Simplified PowerShell execution failed:', errorMessage);
      throw error;
    }
  }

  /**
   * Fokussiert ein Rhino-Fenster mit unified approach (native + PowerShell fallback)
   * @param request - Fokussierungs-Anfrage
   * @returns Unified Fokussierungs-Ergebnis
   */
  async focusRhinoWindowUnified(request: RhinoFocusRequest): Promise<UnifiedRhinoFocusResponseDTO> {
    this.logger.debug('🎯 Unified Rhino focus request:', request);

    try {
      const windows = await this.findRhinoWindows();

      if (windows.length === 0) {
        return {
          success: false,
          message: 'Keine Rhino-Fenster gefunden',
          implementation: 'none',
          timestamp: new Date().toISOString(),
        };
      }

      // Find target window
      let targetWindow: WindowInfo | undefined;
      if (request.processId) {
        targetWindow = windows.find(w => w.processId === request.processId);
      } else if (request.windowTitle) {
        targetWindow = windows.find(w =>
          w.windowTitle.toLowerCase().includes(request.windowTitle.toLowerCase()),
        );
      } else {
        targetWindow = windows[0];
      }

      if (!targetWindow) {
        return {
          success: false,
          message: 'Spezifisches Rhino-Fenster nicht gefunden',
          implementation: 'none',
          timestamp: new Date().toISOString(),
        };
      }

      // Try native implementation first (if available and enabled)
      if (this.rhinoNativeFocusService.isReady() && this.useNativeByDefault) {
        this.logger.debug('🚀 Attempting native focus...');

        try {
          const nativeResult = await this.rhinoNativeFocusService.focusWindow(
            targetWindow.windowHandle,
          );

          if (nativeResult.success) {
            return {
              success: true,
              message: `Native focus successful: ${nativeResult.message}`,
              implementation: 'native',
              windowInfo: targetWindow,
              nativeDetails: {
                methodsAttempted: nativeResult.attemptsLog.map(a => a.method),
                attemptsLog: nativeResult.attemptsLog.map(a => ({
                  method: a.method,
                  success: a.success,
                  errorCode: a.errorCode,
                  durationMs: a.durationMs,
                  timestamp: a.timestamp.toISOString(),
                })),
                lastError: nativeResult.errorCode,
                windowValid: true,
                currentForeground: targetWindow.windowHandle,
                performanceMs: nativeResult.performanceMs,
                processInfo: nativeResult.processInfo,
              },
              timestamp: new Date().toISOString(),
            };
          } else {
            this.logger.warn(
              `⚠️ Native focus failed: ${nativeResult.message}, falling back to PowerShell`,
            );
          }
        } catch (nativeError) {
          this.logger.warn('⚠️ Native focus threw error, falling back to PowerShell:', nativeError);
        }
      }

      // Fallback to PowerShell implementation
      this.logger.debug('🔄 Using PowerShell fallback...');
      const powershellResult = await this.focusWindowByHandle(
        targetWindow.windowHandle,
        request.bringToFront !== false,
        request.restoreIfMinimized !== false,
      );

      return {
        success: powershellResult.success,
        message: `PowerShell: ${powershellResult.message}`,
        implementation: 'powershell',
        windowInfo: powershellResult.success ? targetWindow : undefined,
        timestamp: new Date().toISOString(),
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('❌ Unified focus failed:', errorMessage);

      return {
        success: false,
        message: `Unified focus error: ${errorMessage}`,
        implementation: 'error',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Fokussiert ein spezifisches Rhino-Fenster (Original PowerShell-Implementation)
   * @param request - Fokussierungs-Anfrage
   * @returns Fokussierungs-Ergebnis
   */
  async focusRhinoWindow(request: RhinoFocusRequest): Promise<RhinoFocusResponse> {
    this.logger.debug('🎯 Focusing Rhino window:', request);

    try {
      const windows = await this.findRhinoWindows();

      if (windows.length === 0) {
        return {
          success: false,
          message: 'Keine Rhino-Fenster gefunden',
          timestamp: new Date().toISOString(),
        };
      }

      // Finde das zu fokussierende Fenster
      let targetWindow: WindowInfo | undefined;

      if (request.processId) {
        targetWindow = windows.find(w => w.processId === request.processId);
      } else if (request.windowTitle) {
        targetWindow = windows.find(w =>
          w.windowTitle.toLowerCase().includes(request.windowTitle.toLowerCase()),
        );
      } else {
        // Nimm das erste verfügbare Fenster
        targetWindow = windows[0];
      }

      if (!targetWindow) {
        return {
          success: false,
          message: 'Spezifisches Rhino-Fenster nicht gefunden',
          timestamp: new Date().toISOString(),
        };
      }

      // Fokussiere das Fenster
      const focusResult = await this.focusWindowByHandle(
        targetWindow.windowHandle,
        request.bringToFront !== false,
        request.restoreIfMinimized !== false,
      );

      if (focusResult.success) {
        // Aktualisiere Window-Info
        targetWindow.isActive = true;
      }

      return {
        success: focusResult.success,
        message: focusResult.message,
        windowInfo: targetWindow,
        timestamp: new Date().toISOString(),
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('❌ Failed to focus Rhino window:', errorMessage);
      return {
        success: false,
        message: `Fehler beim Fokussieren: ${errorMessage}`,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Fokussiert ein Fenster über sein Handle
   * @param windowHandle - Fenster-Handle als String
   * @param bringToFront - Fenster in den Vordergrund bringen
   * @param restoreIfMinimized - Fenster wiederherstellen wenn minimiert
   * @returns Fokussierungs-Ergebnis
   */
  private async focusWindowByHandle(
    windowHandle: string,
    bringToFront = true,
    restoreIfMinimized = true,
  ): Promise<{ success: boolean; message: string }> {
    try {
      // PowerShell-Skript zum Fokussieren eines Fensters
      const powershellScript = `
        Add-Type -TypeDefinition '
          using System;
          using System.Runtime.InteropServices;
          public class Win32 {
            [DllImport("user32.dll")]
            public static extern bool SetForegroundWindow(IntPtr hWnd);

            [DllImport("user32.dll")]
            public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

            [DllImport("user32.dll")]
            public static extern bool IsIconic(IntPtr hWnd);

            [DllImport("user32.dll")]
            public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);

            public const int SW_RESTORE = 9;
            public const int SW_SHOW = 5;
            public const IntPtr HWND_TOP = (IntPtr)0;
            public const uint SWP_NOMOVE = 0x0002;
            public const uint SWP_NOSIZE = 0x0001;
          }
        '

        $windowHandle = [IntPtr]${windowHandle}
        $success = $false
        $message = ""

        try {
          # Prüfe ob Fenster minimiert ist und stelle es wieder her
          if (${String(restoreIfMinimized)} -and [Win32]::IsIconic($windowHandle)) {
            [Win32]::ShowWindow($windowHandle, [Win32]::SW_RESTORE) | Out-Null
            Start-Sleep -Milliseconds 100
          }

          # Bringe Fenster in den Vordergrund
          if (${String(bringToFront)}) {
            [Win32]::SetWindowPos($windowHandle, [Win32]::HWND_TOP, 0, 0, 0, 0, [Win32]::SWP_NOMOVE -bor [Win32]::SWP_NOSIZE) | Out-Null
            Start-Sleep -Milliseconds 50
          }

          # Setze Fokus auf das Fenster
          $result = [Win32]::SetForegroundWindow($windowHandle)

          if ($result) {
            $success = $true
            $message = "Fenster erfolgreich fokussiert"
          } else {
            $message = "SetForegroundWindow fehlgeschlagen"
          }
        } catch {
          $message = "Fehler beim Fokussieren: " + $_.Exception.Message
        }

        @{
          Success = $success
          Message = $message
        } | ConvertTo-Json -Compress
      `;

      // Use Base64 encoding and execFile for security
      // PowerShell -EncodedCommand expects UTF-16LE encoding
      const encodedScript = Buffer.from(powershellScript, 'utf16le' as BufferEncoding).toString(
        'base64',
      );
      const { stdout } = await execFileAsync(
        'powershell',
        ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', encodedScript],
        {
          encoding: 'utf8',
          windowsHide: true,
        },
      );
      const result = JSON.parse(stdout.trim());

      this.logger.debug(`🎯 Focus result: ${result.Message}`);

      return {
        success: result.Success,
        message: result.Message,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('❌ Failed to focus window by handle:', errorMessage);
      return {
        success: false,
        message: `PowerShell-Fehler: ${errorMessage}`,
      };
    }
  }

  /**
   * Prüft ob ein Rhino-Fenster aktiv ist
   * @returns Status-Information
   */
  async checkRhinoWindowStatus(): Promise<{
    isActive: boolean;
    windowInfo?: WindowInfo;
    totalWindows: number;
  }> {
    try {
      const windows = await this.findRhinoWindows();
      const activeWindow = windows.find(w => w.isActive);

      return {
        isActive: !!activeWindow,
        windowInfo: activeWindow,
        totalWindows: windows.length,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('❌ Failed to check window status:', errorMessage);
      return {
        isActive: false,
        totalWindows: 0,
      };
    }
  }

  /**
   * Ermittelt Rhino-Prozess-Informationen
   * @returns Array von Prozess-Informationen
   */
  async getRhinoProcessInfo(): Promise<
    {
      processId: number;
      processName: string;
      windowTitle: string;
      startTime: string;
    }[]
  > {
    try {
      const powershellScript = `
        Get-Process -Name "Rhino*" -ErrorAction SilentlyContinue |
        ForEach-Object {
          @{
            ProcessId = $_.Id
            ProcessName = $_.ProcessName
            WindowTitle = $_.MainWindowTitle
            StartTime = $_.StartTime.ToString("yyyy-MM-dd HH:mm:ss")
          } | ConvertTo-Json -Compress
        }
      `;

      // Use Base64 encoding and execFile for security
      // PowerShell -EncodedCommand expects UTF-16LE encoding
      const encodedScript = Buffer.from(powershellScript, 'utf16le' as BufferEncoding).toString(
        'base64',
      );
      const { stdout } = await execFileAsync(
        'powershell',
        ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', encodedScript],
        {
          encoding: 'utf8',
          windowsHide: true,
        },
      );

      if (!stdout.trim()) {
        return [];
      }

      const lines = stdout
        .trim()
        .split('\n')
        .filter(line => line.trim());
      const processes = [];

      for (const line of lines) {
        try {
          const processData = JSON.parse(line);
          processes.push(processData);
        } catch (parseError: unknown) {
          const errorMessage = parseError instanceof Error ? parseError.message : 'Unknown error';
          this.logger.warn('⚠️ Failed to parse process info:', errorMessage);
        }
      }

      return processes;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('❌ Failed to get process info:', errorMessage);
      return [];
    }
  }

  /**
   * Aktiviert/Deaktiviert die native Implementierung als Standard
   * @param enabled - Aktivierungsstatus
   */
  setUseNativeByDefault(enabled: boolean): void {
    this.useNativeByDefault = enabled;
    this.logger.log(
      `${enabled ? '✅' : '🚫'} Native focus implementation ${
        enabled ? 'enabled' : 'disabled'
      } as default`,
    );
  }

  /**
   * Prüft ob die native Implementierung verfügbar ist
   * @returns Verfügbarkeitsstatus
   */
  isNativeImplementationReady(): boolean {
    return this.rhinoNativeFocusService.isReady();
  }

  /**
   * Fokussiert ein Fenster nur mit der nativen Implementierung
   * @param request - Fokussierungs-Anfrage mit Window Handle
   * @returns Native Fokussierungs-Ergebnis
   */
  async focusRhinoWindowNative(
    windowHandle: string | number,
  ): Promise<UnifiedRhinoFocusResponseDTO> {
    if (!this.rhinoNativeFocusService.isReady()) {
      return {
        success: false,
        message: 'Native focus implementation not available',
        implementation: 'error',
        timestamp: new Date().toISOString(),
      };
    }

    try {
      const nativeResult = await this.rhinoNativeFocusService.focusWindow(windowHandle);

      return {
        success: nativeResult.success,
        message: nativeResult.message,
        implementation: 'native',
        nativeDetails: {
          methodsAttempted: nativeResult.attemptsLog.map(a => a.method),
          attemptsLog: nativeResult.attemptsLog.map(a => ({
            method: a.method,
            success: a.success,
            errorCode: a.errorCode,
            durationMs: a.durationMs,
            timestamp: a.timestamp.toISOString(),
          })),
          lastError: nativeResult.errorCode,
          windowValid: true,
          performanceMs: nativeResult.performanceMs,
          processInfo: nativeResult.processInfo,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('❌ Native focus failed:', errorMessage);

      return {
        success: false,
        message: `Native focus error: ${errorMessage}`,
        implementation: 'error',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Debug-Methode für Live-Diagnostik der Rhino-Erkennung
   * @returns Detaillierte Diagnose-Informationen
   */
  async debugRhinoDetection(): Promise<{
    timestamp: string;
    methods: {
      native: {
        available: boolean;
        result: WindowInfo[];
        error?: string;
        performanceMs: number;
      };
      base64PowerShell: {
        available: boolean;
        result: WindowInfo[];
        error?: string;
        performanceMs: number;
        rawOutput?: string;
      };
      simplifiedPowerShell: {
        available: boolean;
        result: WindowInfo[];
        error?: string;
        performanceMs: number;
        rawOutput?: string;
      };
    };
    summary: {
      totalWindowsFound: number;
      recommendedMethod: string;
      issueDiagnosis: string[];
    };
  }> {
    this.logger.debug('🔧 Starting comprehensive Rhino detection debug...');

    const debugResult = {
      timestamp: new Date().toISOString(),
      methods: {
        native: { available: false, result: [], performanceMs: 0 } as any,
        base64PowerShell: { available: false, result: [], performanceMs: 0 } as any,
        simplifiedPowerShell: { available: false, result: [], performanceMs: 0 } as any,
      },
      summary: {
        totalWindowsFound: 0,
        recommendedMethod: 'none',
        issueDiagnosis: [] as string[],
      },
    };

    // Test Method 1: Native Detection
    if (this.rhinoNativeFocusService.isReady()) {
      const nativeStart = Date.now();
      try {
        debugResult.methods.native.result = await this.findRhinoWindowsNative();
        debugResult.methods.native.available = true;
        debugResult.methods.native.performanceMs = Date.now() - nativeStart;
      } catch (error) {
        debugResult.methods.native.error = error instanceof Error ? error.message : 'Unknown error';
        debugResult.methods.native.performanceMs = Date.now() - nativeStart;
      }
    } else {
      debugResult.summary.issueDiagnosis.push(
        'Native Koffi implementation not available or failed to initialize',
      );
    }

    // Test Method 2: Base64 PowerShell
    const base64Start = Date.now();
    try {
      debugResult.methods.base64PowerShell.result =
        await this.findRhinoWindowsWithBase64PowerShell();
      debugResult.methods.base64PowerShell.available = true;
      debugResult.methods.base64PowerShell.performanceMs = Date.now() - base64Start;
    } catch (error) {
      debugResult.methods.base64PowerShell.error =
        error instanceof Error ? error.message : 'Unknown error';
      debugResult.methods.base64PowerShell.performanceMs = Date.now() - base64Start;
    }

    // Test Method 3: Simplified PowerShell
    const simplifiedStart = Date.now();
    try {
      debugResult.methods.simplifiedPowerShell.result =
        await this.findRhinoWindowsWithSimplifiedPowerShell();
      debugResult.methods.simplifiedPowerShell.available = true;
      debugResult.methods.simplifiedPowerShell.performanceMs = Date.now() - simplifiedStart;
    } catch (error) {
      debugResult.methods.simplifiedPowerShell.error =
        error instanceof Error ? error.message : 'Unknown error';
      debugResult.methods.simplifiedPowerShell.performanceMs = Date.now() - simplifiedStart;
    }

    // Analyze results
    const allResults = [
      ...debugResult.methods.native.result,
      ...debugResult.methods.base64PowerShell.result,
      ...debugResult.methods.simplifiedPowerShell.result,
    ];

    debugResult.summary.totalWindowsFound = allResults.length;

    // Determine recommended method
    if (debugResult.methods.native.available && debugResult.methods.native.result.length > 0) {
      debugResult.summary.recommendedMethod = 'native';
    } else if (
      debugResult.methods.base64PowerShell.available &&
      debugResult.methods.base64PowerShell.result.length > 0
    ) {
      debugResult.summary.recommendedMethod = 'base64PowerShell';
    } else if (
      debugResult.methods.simplifiedPowerShell.available &&
      debugResult.methods.simplifiedPowerShell.result.length > 0
    ) {
      debugResult.summary.recommendedMethod = 'simplifiedPowerShell';
    } else {
      debugResult.summary.recommendedMethod = 'none';
    }

    // Issue diagnosis
    if (debugResult.summary.totalWindowsFound === 0) {
      debugResult.summary.issueDiagnosis.push(
        'No Rhino windows found by any method - Rhino may not be running',
      );
    }

    if (
      !debugResult.methods.base64PowerShell.available &&
      !debugResult.methods.simplifiedPowerShell.available
    ) {
      debugResult.summary.issueDiagnosis.push(
        'PowerShell execution failed - check ExecutionPolicy settings',
      );
    }

    if (debugResult.methods.base64PowerShell.error?.includes('timeout')) {
      debugResult.summary.issueDiagnosis.push(
        'PowerShell script timeout - system may be under high load',
      );
    }

    this.logger.debug('🔧 Debug analysis completed:', debugResult.summary);
    return debugResult;
  }

  /**
   * Testet die Verfügbarkeit der Windows API-Funktionen
   * @returns Test-Ergebnis
   */
  async testWindowsApiAvailability(): Promise<{
    available: boolean;
    message: string;
    features: {
      powershell: boolean;
      windowsApi: boolean;
      rhinoDetection: boolean;
    };
  }> {
    const features = {
      powershell: false,
      windowsApi: false,
      rhinoDetection: false,
    };

    try {
      // Test PowerShell - use execFile for security
      await execFileAsync('powershell', ['-Command', 'Write-Output test'], {
        windowsHide: true,
      });
      features.powershell = true;

      // Test Windows API
      const apiTestScript = `
        Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public class Win32Test { [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow(); }'
        [Win32Test]::GetForegroundWindow() | Out-Null
        Write-Output "API_OK"
      `;

      // Use Base64 encoding and execFile for security
      // PowerShell -EncodedCommand expects UTF-16LE encoding
      const encodedScript = Buffer.from(apiTestScript, 'utf16le' as BufferEncoding).toString(
        'base64',
      );
      const { stdout } = await execFileAsync(
        'powershell',
        ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', encodedScript],
        {
          encoding: 'utf8',
          windowsHide: true,
        },
      );
      if (stdout.includes('API_OK')) {
        features.windowsApi = true;
      }

      // Test Rhino-Erkennung
      await this.findRhinoWindows();
      features.rhinoDetection = true; // Funktion ist verfügbar, auch wenn keine Fenster gefunden

      const available = features.powershell && features.windowsApi && features.rhinoDetection;

      return {
        available,
        message: available
          ? 'Windows API-Funktionen sind verfügbar'
          : 'Einige Windows API-Funktionen sind nicht verfügbar',
        features,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('❌ Windows API test failed:', errorMessage);
      return {
        available: false,
        message: `Test fehlgeschlagen: ${errorMessage}`,
        features,
      };
    }
  }
}
