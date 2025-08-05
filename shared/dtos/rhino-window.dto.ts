/**
 * Rhino Window Management DTOs
 * Definiert Datenstrukturen für Rhino-Fenster-Operationen
 */

export interface RhinoWindowInfoDTO {
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

export interface RhinoFocusRequestDTO {
  processId?: number;
  windowTitle?: string;
  bringToFront?: boolean;
  restoreIfMinimized?: boolean;
}

export interface RhinoFocusResponseDTO {
  success: boolean;
  message: string;
  windowInfo?: RhinoWindowInfoDTO;
  timestamp: string;
}

export interface RhinoWindowStatusDTO {
  isActive: boolean;
  windowInfo?: RhinoWindowInfoDTO;
  totalWindows: number;
}

export interface RhinoProcessInfoDTO {
  processId: number;
  processName: string;
  windowTitle: string;
  startTime: string;
}

export interface WindowsApiAvailabilityDTO {
  available: boolean;
  message: string;
  features: {
    powershell: boolean;
    windowsApi: boolean;
    rhinoDetection: boolean;
  };
}

/**
 * Native Focus DTOs for direct Windows API implementation
 */

export interface NativeFocusAttemptDTO {
  method: string;
  success: boolean;
  errorCode?: number;
  durationMs: number;
  timestamp: string;
}

export interface NativeFocusProcessInfoDTO {
  processId: number;
  threadId: number;
}

export interface NativeFocusResponseDTO {
  success: boolean;
  message: string;
  details: {
    methodsAttempted: string[];
    attemptsLog: NativeFocusAttemptDTO[];
    lastError?: number;
    windowValid: boolean;
    currentForeground?: string;
    performanceMs: number;
    processInfo?: NativeFocusProcessInfoDTO;
  };
  windowHandle: string;
  timestamp: string;
}

export interface NativeFocusConfigDTO {
  maxAttempts: number;
  attemptDelayMs: number;
  restoreIfMinimized: boolean;
  bringToFront: boolean;
  operationTimeoutMs: number;
  verboseLogging: boolean;
}

export interface NativeFocusRequestDTO {
  windowHandle: string | number;
  config?: Partial<NativeFocusConfigDTO>;
}

/**
 * Combined response that can handle both PowerShell and Native implementations
 */
export interface UnifiedRhinoFocusResponseDTO {
  success: boolean;
  message: string;
  implementation: 'powershell' | 'native' | 'error' | 'none';
  windowInfo?: RhinoWindowInfoDTO;
  nativeDetails?: NativeFocusResponseDTO['details'];
  timestamp: string;
}
