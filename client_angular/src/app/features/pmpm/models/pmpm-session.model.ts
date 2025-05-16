/**
 * Represents a PMPM session request
 */
export interface PmpmSessionRequest {
  /**
   * ID of the model to load in PMPM
   */
  modelId: string;

  /**
   * Optional configuration parameters for the session
   */
  configuration?: string;
}

/**
 * Represents a PMPM session response from the server
 */
export interface PmpmSession {
  /**
   * Unique identifier for the session
   */
  sessionId: string;

  /**
   * Connection ID to the Guacamole RDP session
   */
  connectionId: string;

  /**
   * Short-lived JWT token for authentication
   */
  token: string;

  /**
   * URL to the Guacamole session
   */
  url?: string;
}

/**
 * Represents the status of a PMPM session
 */
export interface PmpmSessionStatus {
  /**
   * Session identifier
   */
  sessionId: string;

  /**
   * Current status of the session (active, closed, etc.)
   */
  status: 'active' | 'closed';

  /**
   * ID of the model associated with the session
   */
  modelId: string;

  /**
   * When the session was created
   */
  createdAt: Date;
}

/**
 * Represents a parameter change in the 3D model
 */
export interface ParameterChange {
  /**
   * Identifier for the parameter
   */
  parameterId: string;

  /**
   * New value for the parameter
   */
  value: number;

  /**
   * Optional metadata for the parameter change
   */
  metadata?: Record<string, any>;
}

/**
 * Represents results from a parameter update
 */
export interface ParameterUpdateResult extends ParameterChange {
  /**
   * Analysis results from the parameter change
   */
  results: {
    stressValue?: number;
    deformation?: number;
    [key: string]: any;
  };
}
