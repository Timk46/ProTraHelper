/**
 * DTOs für Bat-Rhino Service
 * Typsichere Interfaces für die .bat-Skript-basierte Rhino-Integration
 */

// Frontend Service DTOs
export interface BatRhinoRequest {
  filePath: string;
  rhinoCommand: string;
  rhinoPath?: string;
  showViewport?: boolean;
  batchMode?: boolean;
  outputDirectory?: string;
}

export interface BatRhinoResponse {
  success: boolean;
  message: string;
  batScriptPath?: string;
  downloadUrl?: string;
  executionId?: string;
  rhinoPath?: string;
  timestamp: string;
}

export interface RhinoPathDetectionResponse {
  success: boolean;
  rhinoPath?: string;
  version?: string;
  installations: RhinoInstallation[];
  message: string;
}

export interface RhinoInstallation {
  version: string;
  path: string;
  isDefault: boolean;
}

export interface BatRhinoSetupStatus {
  rhinoDetected: boolean;
  rhinoPath?: string;
  rhinoVersion?: string;
  canGenerateScripts: boolean;
  message: string;
}

// Backend Service DTOs (für bestehende Controller/Services)
export interface BatScriptConfig {
  rhinoPath: string;
  filePath: string;
  command: string;
  outputDirectory?: string;
  batchMode?: boolean;
  showViewport?: boolean;
}

export interface BatScriptRequest {
  filePath: string;
  rhinoCommand?: string;
  command?: string;
  rhinoPath?: string;
  outputDirectory?: string;
  batchMode?: boolean;
  showViewport?: boolean;
  userId?: string;
}

export interface BatExecutionResult {
  success: boolean;
  message: string;
  batScriptPath?: string;
  registryPath?: string;
  downloadUrl?: string;
  executionId?: string;
  rhinoPath?: string;
  timestamp: Date;
  scriptGenerated?: boolean;
  protocolRegistered?: boolean;
  rhinoLaunched?: boolean;
  downloadUrls?: {
    batScript: string;
    registryFile: string;
    setupPackage: string;
  };
}

export interface RhinoPathValidationResult {
  isValid: boolean;
  path?: string;
  version?: string;
  message: string;
}

export interface BatScriptStatus {
  isReady: boolean;
  rhinoDetected: boolean;
  rhinoPath?: string;
  message: string;
  isSetupCompleted?: boolean;
  protocolRegistered?: boolean;
  rhinoPathConfigured?: boolean;
  setupSteps?: BatScriptSetupStep[];
}

export interface BatScriptSetupStep {
  stepNumber: number;
  title: string;
  description: string;
  isCompleted: boolean;
  isOptional: boolean;
  action?: 'confirm' | 'execute' | 'download' | 'test';
  commandToRun?: string;
  downloadUrl?: string;
}

export interface SetupPackageInfo {
  packageId: string;
  version: string;
  downloadUrl: string;
  checksumSha256: string;
  fileSize: number;
  createdAt: Date;
  name?: string;
  description?: string;
  platform?: 'windows' | 'mac' | 'linux';
}
