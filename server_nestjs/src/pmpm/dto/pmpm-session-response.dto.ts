/**
 * Response DTO for a created PMPM session
 */
export class PmpmSessionResponseDto {
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
   * URL to the Guacamole session (optional, can be constructed on client side)
   */
  url?: string;
}
