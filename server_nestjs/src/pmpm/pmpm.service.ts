import {
  Injectable,
  Logger,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { v4 as uuidv4 } from 'uuid';
import { CreatePmpmSessionDto } from './dto/create-pmpm-session.dto';
import { PmpmSessionResponseDto } from './dto/pmpm-session-response.dto';

// Map to store active sessions
interface SessionData {
  connectionId: string;
  modelId: string;
  createdAt: Date;
  status: 'active' | 'closed';
}

@Injectable()
export class PmpmService {
  private readonly logger = new Logger(PmpmService.name);
  private readonly activeSessions = new Map<string, SessionData>();

  // Guacamole configuration
  private readonly guacamoleBaseUrl = 'http://localhost:8080/guacamole';
  private readonly guacamoleConnectionId = '1'; // Use the connection ID we found

  constructor(private readonly jwtService: JwtService) {}

  /**
   * Creates a new session for PMPM in Guacamole
   */
  async createSession(
    createSessionDto: CreatePmpmSessionDto,
  ): Promise<PmpmSessionResponseDto> {
    const sessionId = uuidv4();

    // Store session data
    this.activeSessions.set(sessionId, {
      connectionId: this.guacamoleConnectionId,
      modelId: createSessionDto.modelId,
      createdAt: new Date(),
      status: 'active',
    });

    // Generate a token for the session
    const payload = {
      sub: sessionId,
      modelId: createSessionDto.modelId,
      type: 'pmpm-session',
    };

    const token = this.jwtService.sign(payload);

    const response: PmpmSessionResponseDto = {
      sessionId,
      connectionId: this.guacamoleConnectionId,
      token,
      url: `${this.guacamoleBaseUrl}/#/client/c/${this.guacamoleConnectionId}?token=${token}`,
    };

    this.logger.log(
      `Created PMPM session ${sessionId} for model ${createSessionDto.modelId}`,
    );

    return response;
  }

  /**
   * Gets the status of an existing session
   */
  async getSessionStatus(sessionId: string) {
    const session = this.activeSessions.get(sessionId);

    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    return {
      sessionId,
      status: session.status,
      modelId: session.modelId,
      createdAt: session.createdAt,
    };
  }

  /**
   * Closes a session
   */
  async closeSession(sessionId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);

    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    // Update session status
    session.status = 'closed';
    this.activeSessions.set(sessionId, session);

    this.logger.log(`Closed PMPM session ${sessionId}`);

    // In a real implementation, we would also close the Guacamole connection
    // using the Guacamole API
  }
}
