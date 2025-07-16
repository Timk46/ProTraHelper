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
import { PeerReviewService } from './peer-review.service';
import type { PeerReviewDTO } from '../../../shared/dtos/peer-review.dto';
import { CreatePeerReviewDTO, UpdatePeerReviewDTO } from '../../../shared/dtos/peer-review.dto';

@Controller('peer-review/reviews')
@UseGuards(JwtAuthGuard)
export class PeerReviewController {
  constructor(private readonly reviewService: PeerReviewService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createReview(
    @Body() createDto: CreatePeerReviewDTO,
    @Request() req: any,
  ): Promise<PeerReviewDTO> {
    return this.reviewService.createReview(createDto, req.user.id);
  }

  @Get(':id')
  async getReview(@Param('id') reviewId: string, @Request() req: any): Promise<PeerReviewDTO> {
    return this.reviewService.getReview(reviewId, req.user.id);
  }

  @Get()
  async getReviews(
    @Request() req: any,
    @Query('sessionId') sessionId?: string,
    @Query('submissionId') submissionId?: string,
    @Query('myReviews') myReviews?: string,
  ): Promise<PeerReviewDTO[]> {
    if (myReviews === 'true') {
      return this.reviewService.getUserReviews(req.user.id);
    }

    if (sessionId) {
      return this.reviewService.getReviewsBySession(sessionId, req.user.id);
    }

    if (submissionId) {
      return this.reviewService.getReviewsBySubmission(submissionId, req.user.id);
    }

    throw new Error(
      'Either sessionId, submissionId, or myReviews=true query parameter is required',
    );
  }

  @Put(':id')
  async updateReview(
    @Param('id') reviewId: string,
    @Body() updateDto: UpdatePeerReviewDTO,
    @Request() req: any,
  ): Promise<PeerReviewDTO> {
    return this.reviewService.updateReview(reviewId, updateDto, req.user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteReview(@Param('id') reviewId: string, @Request() req: any): Promise<void> {
    return this.reviewService.deleteReview(reviewId, req.user.id);
  }
}
