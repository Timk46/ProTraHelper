import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Body, 
  Param, 
  Query, 
  UseGuards, 
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/common/guards/jwt-auth.guard';
import { PeerReviewSessionService } from './peer-review-session.service';
import { 
  CreatePeerReviewSessionDTO, 
  UpdatePeerReviewSessionDTO, 
  PeerReviewSessionDTO 
} from '../../../shared/dtos/peer-review-session.dto';
import { PeerReviewStatsDTO } from '../../../shared/dtos/peer-review.dto';

@Controller('peer-review/sessions')
@UseGuards(JwtAuthGuard)
export class PeerReviewSessionController {
  constructor(
    private readonly sessionService: PeerReviewSessionService
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createSession(
    @Body() createDto: CreatePeerReviewSessionDTO,
    @Request() req: any
  ): Promise<PeerReviewSessionDTO> {
    return this.sessionService.createSession(createDto, req.user.id);
  }

  @Get(':id')
  async getSession(
    @Param('id') sessionId: string
  ): Promise<PeerReviewSessionDTO> {
    return this.sessionService.getSession(sessionId);
  }

  @Get()
  async getSessionsByModule(
    @Query('moduleId') moduleId: string
  ): Promise<PeerReviewSessionDTO[]> {
    if (!moduleId) {
      throw new Error('moduleId query parameter is required');
    }
    return this.sessionService.getSessionsByModule(parseInt(moduleId));
  }

  @Put(':id')
  async updateSession(
    @Param('id') sessionId: string,
    @Body() updateDto: UpdatePeerReviewSessionDTO,
    @Request() req: any
  ): Promise<PeerReviewSessionDTO> {
    return this.sessionService.updateSession(sessionId, updateDto, req.user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteSession(
    @Param('id') sessionId: string,
    @Request() req: any
  ): Promise<void> {
    return this.sessionService.deleteSession(sessionId, req.user.id);
  }

  @Get(':id/stats')
  async getSessionStats(
    @Param('id') sessionId: string
  ): Promise<PeerReviewStatsDTO> {
    return this.sessionService.getSessionStats(sessionId);
  }
}