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
