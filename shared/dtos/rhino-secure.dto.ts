/**
 * Secure Rhino Operation DTOs with Input Validation
 * Diese DTOs enthalten Sicherheitsvalidierung für alle Rhino-Operationen
 */

import { 
  IsString, 
  IsOptional, 
  IsBoolean, 
  IsNumber, 
  IsNotEmpty, 
  MaxLength, 
  Min, 
  Max,
  Matches,
  IsIn,
  ValidateNested
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Secure DTO for Rhino file launch operations
 */
export class SecureRhinoLaunchRequestDTO {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  @Matches(/^[a-zA-Z]:\\[\w\s\-\\\.]+\.(gh|3dm)$/i, {
    message: 'filePath must be a valid Windows path to a .gh or .3dm file'
  })
  filePath!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Matches(/^[a-zA-Z]:\\[\w\s\-\\\.]+\.exe$/i, {
    message: 'rhinoPath must be a valid Windows path to an executable'
  })
  rhinoPath?: string;

  @IsOptional()
  @IsBoolean()
  showViewport?: boolean;

  @IsOptional()
  @IsBoolean()
  batchMode?: boolean;
}

/**
 * Secure DTO for Rhino window focus operations
 */
export class SecureRhinoFocusRequestDTO {
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(65535)
  processId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  @Matches(/^[\w\s\-\.]+$/, {
    message: 'windowTitle must contain only alphanumeric characters, spaces, hyphens, and dots'
  })
  windowTitle?: string;

  @IsOptional()
  @IsBoolean()
  bringToFront?: boolean;

  @IsOptional()
  @IsBoolean()
  restoreIfMinimized?: boolean;
}

/**
 * Secure configuration for native focus operations
 */
export class SecureNativeFocusConfigDTO {
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  maxAttempts?: number = 3;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5000)
  attemptDelayMs?: number = 100;

  @IsOptional()
  @IsBoolean()
  restoreIfMinimized?: boolean = true;

  @IsOptional()
  @IsBoolean()
  bringToFront?: boolean = true;

  @IsOptional()
  @IsNumber()
  @Min(1000)
  @Max(30000)
  operationTimeoutMs?: number = 10000;

  @IsOptional()
  @IsBoolean()
  verboseLogging?: boolean = false;
}

/**
 * Secure DTO for native window focus requests
 */
export class SecureNativeFocusRequestDTO {
  @IsString()
  @IsNotEmpty()
  @Matches(/^(0x)?[0-9a-fA-F]+$|^\d+$/, {
    message: 'windowHandle must be a valid hexadecimal or decimal number'
  })
  windowHandle!: string | number;

  @IsOptional()
  @ValidateNested()
  @Type(() => SecureNativeFocusConfigDTO)
  config?: SecureNativeFocusConfigDTO;
}

/**
 * Secure DTO for system configuration changes
 */
export class SecureSystemConfigRequestDTO {
  @IsBoolean()
  @IsNotEmpty()
  enabled!: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;
}

/**
 * Secure DTO for debug operations (admin only)
 */
export class SecureDebugRequestDTO {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @IsIn(['basic', 'detailed', 'full'], {
    message: 'debugLevel must be one of: basic, detailed, full'
  })
  debugLevel?: 'basic' | 'detailed' | 'full' = 'basic';

  @IsOptional()
  @IsBoolean()
  includeSystemInfo?: boolean = false;

  @IsOptional()
  @IsBoolean()
  includePerformanceMetrics?: boolean = false;
}

/**
 * Base response DTO with security context
 */
export class SecureRhinoResponseBaseDTO {
  success!: boolean;
  message!: string;
  timestamp!: string;
  
  @IsOptional()
  requestId?: string;
  
  @IsOptional()
  securityContext?: {
    userId: number;
    userRole: string;
    authenticated: boolean;
  };
}