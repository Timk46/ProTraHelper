/**
 * Rhino Window Manager Service
 * Verwaltet Windows-Fenster-Operationen für Rhino 8 Integration
 * Verwendet Windows PowerShell-Befehle für Fenster-Management
 */

import { Injectable, Logger } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

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

  constructor() {
    this.logger.log('🪟 Rhino Window Manager Service initialized');
  }

  /**
   * Findet alle Rhino-Fenster im System
   * @returns Array von WindowInfo-Objekten
   */
  async findRhinoWindows(): Promise<WindowInfo[]> {
    this.logger.debug('🔍 Searching for Rhino windows...');

    try {
      // PowerShell-Skript zum Finden von Rhino-Fenstern
      const powershellScript = `
        Get-Process -Name "Rhino*" -ErrorAction SilentlyContinue |
        Where-Object { $_.MainWindowTitle -ne "" } |
        ForEach-Object {
          $process = $_
          $windowInfo = @{
            ProcessId = $process.Id
            WindowTitle = $process.MainWindowTitle
            WindowHandle = $process.MainWindowHandle.ToString()
            IsVisible = $true
            IsActive = $false
          }

          # Prüfe ob Fenster aktiv ist
          Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public class Win32 { [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow(); }'
          $foregroundWindow = [Win32]::GetForegroundWindow()
          if ($foregroundWindow -eq $process.MainWindowHandle) {
            $windowInfo.IsActive = $true
          }

          $windowInfo | ConvertTo-Json -Compress
        }
      `;

      const { stdout } = await execAsync(`powershell -Command "${powershellScript}"`);

      if (!stdout.trim()) {
        this.logger.warn('⚠️ No Rhino windows found');
        return [];
      }

      // Parse JSON-Ausgabe
      const lines = stdout
        .trim()
        .split('\n')
        .filter(line => line.trim());
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
        } catch (parseError: unknown) {
          const errorMessage = parseError instanceof Error ? parseError.message : 'Unknown error';
          this.logger.warn('⚠️ Failed to parse window info:', errorMessage);
        }
      }

      this.logger.debug(`✅ Found ${windows.length} Rhino windows`);
      return windows;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('❌ Failed to find Rhino windows:', errorMessage);
      throw new Error(`Fehler beim Suchen von Rhino-Fenstern: ${errorMessage}`);
    }
  }

  /**
   * Fokussiert ein spezifisches Rhino-Fenster
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
          w.windowTitle.toLowerCase().includes(request.windowTitle!.toLowerCase()),
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

      const { stdout } = await execAsync(`powershell -Command "${powershellScript}"`);
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

      const { stdout } = await execAsync(`powershell -Command "${powershellScript}"`);

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
      // Test PowerShell
      await execAsync('powershell -Command "Write-Output test"');
      features.powershell = true;

      // Test Windows API
      const apiTestScript = `
        Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public class Win32Test { [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow(); }'
        [Win32Test]::GetForegroundWindow() | Out-Null
        Write-Output "API_OK"
      `;

      const { stdout } = await execAsync(`powershell -Command "${apiTestScript}"`);
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
