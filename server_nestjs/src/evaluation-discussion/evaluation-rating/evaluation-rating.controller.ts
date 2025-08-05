import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/common/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/common/guards/roles.guard';
import { roles } from '../../auth/common/guards/roles.guard';
import { EvaluationRatingService } from './evaluation-rating.service';
import { EvaluationRatingDTO } from '@DTOs/index';
import { CreateEvaluationRatingDTO, UpdateEvaluationRatingDTO } from '@DTOs/index';

@Controller('evaluation-ratings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EvaluationRatingController {
  constructor(private readonly evaluationRatingService: EvaluationRatingService) {}

  @Post()
  @roles('ANY')
  async rate(
    @Body() ratingDto: CreateEvaluationRatingDTO,
    @Req() req: any,
  ): Promise<EvaluationRatingDTO> {
    return this.evaluationRatingService.rate(ratingDto, req.user.id);
  }

  @Put(':id')
  @roles('ANY')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateEvaluationRatingDTO,
    @Req() req: any,
  ): Promise<EvaluationRatingDTO> {
    return this.evaluationRatingService.update(Number(id), updateDto, req.user.id);
  }

  @Get('submission/:submissionId')
  @roles('ANY')
  async getSubmissionRatings(
    @Param('submissionId') submissionId: string,
  ): Promise<EvaluationRatingDTO[]> {
    return this.evaluationRatingService.getSubmissionRatings(submissionId);
  }

  @Get('category/:categoryId')
  @roles('ANY')
  async getCategoryRatings(
    @Param('categoryId') categoryId: string,
  ): Promise<EvaluationRatingDTO[]> {
    return this.evaluationRatingService.getCategoryRatings(Number(categoryId));
  }

  @Get('submission/:submissionId/summary')
  @roles('ANY')
  async getRatingSummary(@Param('submissionId') submissionId: string) {
    return this.evaluationRatingService.getRatingSummary(submissionId);
  }

  @Get('submission/:submissionId/user/:userId')
  @roles('ANY')
  async getUserRatings(
    @Param('submissionId') submissionId: string,
    @Param('userId') userId: string,
  ) {
    return this.evaluationRatingService.getUserRatings(submissionId, Number(userId));
  }

  @Get('submission/:submissionId/category/:categoryId/stats')
  @roles('ANY')
  async getCategoryStats(
    @Param('submissionId') submissionId: string,
    @Param('categoryId') categoryId: string,
  ) {
    return this.evaluationRatingService.getCategoryStats(submissionId, Number(categoryId));
  }
}
