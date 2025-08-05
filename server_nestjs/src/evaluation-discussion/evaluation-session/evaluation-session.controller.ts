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
import { EvaluationSessionService } from './evaluation-session.service';
import { EvaluationSessionDTO, EvaluationCategoryDTO } from '@DTOs/index';
import { CreateEvaluationSessionDTO, UpdateEvaluationSessionDTO } from '@DTOs/index';

@Controller('evaluation-sessions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EvaluationSessionController {
  constructor(private readonly evaluationSessionService: EvaluationSessionService) {}

  @Get()
  @roles('ANY')
  async findAll(@Query('moduleId') moduleId?: string): Promise<EvaluationSessionDTO[]> {
    return this.evaluationSessionService.findAll(moduleId ? Number(moduleId) : undefined);
  }

  @Get(':id')
  @roles('ANY')
  async findOne(@Param('id') id: string): Promise<EvaluationSessionDTO> {
    return this.evaluationSessionService.findOne(Number(id));
  }

  @Post()
  @roles('TEACHER', 'ADMIN')
  async create(
    @Body() createDto: CreateEvaluationSessionDTO,
    @Req() req: any,
  ): Promise<EvaluationSessionDTO> {
    return this.evaluationSessionService.create(createDto, req.user.id);
  }

  @Put(':id')
  @roles('TEACHER', 'ADMIN')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateEvaluationSessionDTO,
  ): Promise<EvaluationSessionDTO> {
    return this.evaluationSessionService.update(Number(id), updateDto);
  }

  @Delete(':id')
  @roles('TEACHER', 'ADMIN')
  async remove(@Param('id') id: string): Promise<void> {
    return this.evaluationSessionService.remove(Number(id));
  }

  @Post(':id/switch-phase')
  @roles('TEACHER', 'ADMIN')
  async switchPhase(
    @Param('id') id: string,
    @Body() body: { phase: 'DISCUSSION' | 'EVALUATION' },
  ): Promise<EvaluationSessionDTO> {
    return this.evaluationSessionService.switchPhase(Number(id), body.phase);
  }

  /**
   * Get all evaluation categories for a session
   *
   * @description Retrieves all evaluation categories associated with a specific evaluation session.
   * Categories are used to organize discussions and ratings into thematic groups.
   *
   * @param id - The ID of the evaluation session
   * @returns Promise resolving to an array of evaluation categories ordered by their display order
   *
   * @example
   * GET /evaluation-sessions/123/categories
   * Returns: [{ id: 1, name: 'vollstaendigkeit', displayName: 'Vollständigkeit', ... }]
   */
  @Get(':id/categories')
  @roles('ANY')
  async getCategories(@Param('id') id: string): Promise<EvaluationCategoryDTO[]> {
    return this.evaluationSessionService.getCategories(Number(id));
  }
}
