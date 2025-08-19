/**
 * Windows API Type Definitions
 * Provides TypeScript definitions for Windows API types and structures
 * Used for native Windows API calls via Koffi
 */

/**
 * Basic Windows API data types
 */
export interface WindowsApiTypes {
  /** Window handle */
  HWND: number;
  /** 32-bit unsigned integer */
  DWORD: number;
  /** Boolean value (0 or 1) */
  BOOL: number;
  /** Unsigned integer */
  UINT: number;
  /** Long parameter */
  LPARAM: number;
  /** Word parameter */
  WPARAM: number;
  /** Handle type (generic) */
  HANDLE: number;
  /** Pointer to null-terminated string */
  LPCTSTR: string;
  /** Integer pointer */
  LPINT: number;
}

/**
 * Window rectangle structure
 */
export interface WindowRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/**
 * Process and thread information
 */
export interface ProcessThreadInfo {
  processId: number;
  threadId: number;
}

/**
 * Window placement structure
 */
export interface WindowPlacement {
  length: number;
  flags: number;
  showCmd: number;
  ptMinPosition: { x: number; y: number };
  ptMaxPosition: { x: number; y: number };
  rcNormalPosition: WindowRect;
}

/**
 * Window information structure
 */
export interface WindowInfo {
  cbSize: number;
  rcWindow: WindowRect;
  rcClient: WindowRect;
  dwStyle: number;
  dwExStyle: number;
  dwWindowStatus: number;
  cxWindowBorders: number;
  cyWindowBorders: number;
  atomWindowType: number;
  wCreatorVersion: number;
}

/**
 * Native focus result with detailed information
 */
export interface NativeFocusResult {
  success: boolean;
  message: string;
  errorCode?: number;
  methodUsed?: string;
  attemptsLog: FocusAttempt[];
  performanceMs: number;
  windowHandle: string;
  processInfo?: ProcessThreadInfo;
}

/**
 * Individual focus attempt information
 */
export interface FocusAttempt {
  method: string;
  success: boolean;
  errorCode?: number;
  durationMs: number;
  timestamp: Date;
}

/**
 * Windows API function signatures for Koffi
 */
export interface WindowsApiFunctions {
  // Window manipulation
  SetForegroundWindow: (hWnd: number) => number;
  ShowWindow: (hWnd: number, nCmdShow: number) => number;
  IsIconic: (hWnd: number) => number;
  IsWindow: (hWnd: number) => number;
  SetWindowPos: (
    hWnd: number,
    hWndInsertAfter: number,
    X: number,
    Y: number,
    cx: number,
    cy: number,
    uFlags: number,
  ) => number;
  BringWindowToTop: (hWnd: number) => number;
  SetActiveWindow: (hWnd: number) => number;

  // Thread and process
  GetWindowThreadProcessId: (hWnd: number, lpdwProcessId: Buffer | null) => number;
  AttachThreadInput: (idAttach: number, idAttachTo: number, fAttach: number) => number;
  GetCurrentThreadId: () => number;
  AllowSetForegroundWindow: (dwProcessId: number) => number;

  // Window finding and info
  GetForegroundWindow: () => number;
  FindWindowA: (lpClassName: string | null, lpWindowName: string | null) => number;
  GetWindowTextA: (hWnd: number, lpString: Buffer, nMaxCount: number) => number;
  GetWindowTextLengthA: (hWnd: number) => number;

  // System parameters
  SystemParametersInfoA: (
    uiAction: number,
    uiParam: number,
    pvParam: Buffer | null,
    fWinIni: number,
  ) => number;

  // Error handling
  GetLastError: () => number;
  SetLastError: (dwErrCode: number) => void;
}

/**
 * Configuration for native focus operations
 */
export interface NativeFocusConfig {
  /** Maximum number of attempts for each method */
  maxAttempts: number;
  /** Delay between attempts in milliseconds */
  attemptDelayMs: number;
  /** Whether to restore minimized windows */
  restoreIfMinimized: boolean;
  /** Whether to bring window to top */
  bringToFront: boolean;
  /** Timeout for entire operation in milliseconds */
  operationTimeoutMs: number;
  /** Enable detailed logging */
  verboseLogging: boolean;
}

/**
 * Windows error code mappings
 */
export const WindowsErrorCodes = {
  ERROR_SUCCESS: 0,
  ERROR_INVALID_WINDOW_HANDLE: 1400,
  ERROR_ACCESS_DENIED: 5,
  ERROR_INVALID_PARAMETER: 87,
  ERROR_TIMEOUT: 1460,
  ERROR_NOT_FOUND: 1168,
} as const;

export type WindowsErrorCode = (typeof WindowsErrorCodes)[keyof typeof WindowsErrorCodes];
