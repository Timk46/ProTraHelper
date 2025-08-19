/**
 * DTOs for unified Rhino focus/launch operations
 * Combines functionality from rhino-window.dto and bat-rhino.dto
 */

/**
 * Request DTO for ensuring Rhino is active (focus or launch)
 */
export interface EnsureRhinoActiveRequestDTO {
  /**
   * Optional Grasshopper file path to open
   */
  grasshopperFilePath?: string;

  /**
   * Whether to show viewport after opening
   * @default true
   */
  showViewport?: boolean;

  /**
   * Whether to run in batch mode
   * @default true
   */
  batchMode?: boolean;

  /**
   * User ID for tracking (optional)
   * @default "web-user"
   */
  userId?: string;

  /**
   * Custom Rhino path (optional, auto-detected if not provided)
   */
  rhinoPath?: string;

  /**
   * Preference for focusing method
   * @default "unified"
   */
  focusMethod?: 'unified' | 'native' | 'powershell';

  /**
   * Whether to restore window if minimized
   * @default true
   */
  restoreIfMinimized?: boolean;

  /**
   * Whether to bring window to front
   * @default true
   */
  bringToFront?: boolean;
}

/**
 * Response DTO for ensure Rhino active operation
 */
export interface EnsureRhinoActiveResponseDTO {
  /**
   * Whether the operation was successful
   */
  success: boolean;

  /**
   * Human-readable message describing the result
   */
  message: string;

  /**
   * What action was taken
   */
  action: 'focused' | 'launched' | 'already_active' | 'failed';

  /**
   * Details about the Rhino window (if found/created)
   */
  windowInfo?: {
    processId: number;
    windowHandle: string;
    windowTitle: string;
    isVisible: boolean;
    isActive: boolean;
  };

  /**
   * If Rhino was launched, information about the process
   */
  launchInfo?: {
    processId: number;
    rhinoPath: string;
    grasshopperFile?: string;
    executionTimeMs: number;
  };

  /**
   * If focus was attempted, details about the focus operation
   */
  focusInfo?: {
    method: 'native' | 'powershell' | 'unified';
    attempts: number;
    performanceMs: number;
    windowsFound: number;
  };

  /**
   * Timestamp of the operation
   */
  timestamp: string;

  /**
   * Performance metrics
   */
  performanceMs: number;

  /**
   * Any errors that occurred (non-fatal)
   */
  warnings?: string[];
}

/**
 * Status DTO for Rhino availability check
 */
export interface RhinoAvailabilityStatusDTO {
  /**
   * Whether Rhino is currently running
   */
  isRunning: boolean;

  /**
   * Whether Rhino executable can be found
   */
  isInstalled: boolean;

  /**
   * Number of Rhino windows currently open
   */
  windowCount: number;

  /**
   * Available Rhino installations
   */
  installations: Array<{
    path: string;
    version?: string;
    isValid: boolean;
  }>;

  /**
   * Whether native focus methods are available
   */
  nativeFocusAvailable: boolean;

  /**
   * Whether PowerShell focus methods are available
   */
  powershellFocusAvailable: boolean;

  /**
   * Recommended action for user
   */
  recommendedAction: 'focus' | 'launch' | 'install' | 'unknown';

  /**
   * Timestamp of the check
   */
  timestamp: string;
}