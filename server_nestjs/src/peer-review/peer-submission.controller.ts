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
import { PeerSubmissionService } from './peer-submission.service';
import type { PeerSubmissionDTO } from '../../../shared/dtos/peer-submission.dto';
import {
  CreatePeerSubmissionDTO,
  UpdatePeerSubmissionDTO,
} from '../../../shared/dtos/peer-submission.dto';

@Controller('peer-review/submissions')
@UseGuards(JwtAuthGuard)
export class PeerSubmissionController {
  constructor(private readonly submissionService: PeerSubmissionService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createSubmission(
    @Body() createDto: CreatePeerSubmissionDTO,
    @Request() req: any,
  ): Promise<PeerSubmissionDTO> {
    return this.submissionService.createSubmission(createDto, req.user.id);
  }

  @Get(':id')
  async getSubmission(
    @Param('id') submissionId: string,
    @Request() req: any,
  ): Promise<PeerSubmissionDTO> {
    return this.submissionService.getSubmission(submissionId, req.user.id);
  }

  @Get()
  async getSubmissions(
    @Request() req: any,
    @Query('sessionId') sessionId?: string,
    @Query('mySubmissions') mySubmissions?: string,
  ): Promise<PeerSubmissionDTO[]> {
    if (mySubmissions === 'true') {
      return this.submissionService.getUserSubmissions(req.user.id);
    }

    if (sessionId) {
      return this.submissionService.getSubmissionsBySession(sessionId, req.user.id);
    }

    throw new Error('Either sessionId or mySubmissions=true query parameter is required');
  }

  @Put(':id')
  async updateSubmission(
    @Param('id') submissionId: string,
    @Body() updateDto: UpdatePeerSubmissionDTO,
    @Request() req: any,
  ): Promise<PeerSubmissionDTO> {
    return this.submissionService.updateSubmission(submissionId, updateDto, req.user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteSubmission(@Param('id') submissionId: string, @Request() req: any): Promise<void> {
    return this.submissionService.deleteSubmission(submissionId, req.user.id);
  }
}
