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
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/common/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/common/guards/roles.guard';
import { roles } from '../../auth/common/guards/roles.guard';
import { EvaluationCommentService } from './evaluation-comment.service';
import type { EvaluationCommentDTO } from '@DTOs/index';
import { CreateEvaluationCommentDTO, UpdateEvaluationCommentDTO } from '@DTOs/index';

@Controller('evaluation-comments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EvaluationCommentController {
  constructor(private readonly evaluationCommentService: EvaluationCommentService) {}

  @Get()
  @roles('ANY')
  async findBySubmission(
    @Query('submissionId') submissionId: string,
    @Query('categoryId') categoryId?: string,
  ): Promise<EvaluationCommentDTO[]> {
    return this.evaluationCommentService.findBySubmission(
      submissionId,
      categoryId ? Number(categoryId) : undefined,
    );
  }

  @Get(':id')
  @roles('ANY')
  async findOne(@Param('id') id: string): Promise<EvaluationCommentDTO> {
    return this.evaluationCommentService.findOne(id);
  }

  @Post()
  @roles('ANY')
  async create(
    @Body() createDto: CreateEvaluationCommentDTO,
    @Req() req: any,
  ): Promise<EvaluationCommentDTO> {
    return this.evaluationCommentService.create(createDto, req.user.id);
  }

  @Put(':id')
  @roles('ANY')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateEvaluationCommentDTO,
    @Req() req: any,
  ): Promise<EvaluationCommentDTO> {
    return this.evaluationCommentService.update(id, updateDto, req.user.id);
  }

  @Delete(':id')
  @roles('ANY')
  async remove(@Param('id') id: string, @Req() req: any): Promise<void> {
    return this.evaluationCommentService.remove(id, req.user.id);
  }

  @Get(':id/replies')
  @roles('ANY')
  async getReplies(@Param('id') id: string): Promise<EvaluationCommentDTO[]> {
    // Replies not implemented in simplified model
    return [];
  }

  @Post(':id/vote')
  @roles('ANY')
  async vote(
    @Param('id') id: string,
    @Body() body: { voteType: 'UP' | 'DOWN' | null },
    @Req() req: any,
  ) {
    return this.evaluationCommentService.vote(id, body.voteType, req.user.id);
  }

  @Get(':id/votes')
  @roles('ANY')
  async getVotes(@Param('id') id: string, @Req() req: any) {
    return this.evaluationCommentService.getVotes(id, req.user.id);
  }
}
