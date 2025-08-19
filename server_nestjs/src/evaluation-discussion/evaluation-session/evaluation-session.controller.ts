/* eslint-disable @typescript-eslint/consistent-type-imports */
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

/**
 * Controller for managing evaluation sessions.
 *
 * This controller provides endpoints for creating, retrieving, updating, and deleting
 * evaluation sessions, as well as switching their phases and retrieving associated categories.
 * All endpoints are protected by JWT authentication and role-based authorization.
 */
@Controller('evaluation-sessions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EvaluationSessionController {
  /**
   * Constructs the EvaluationSessionController.
   * @param evaluationSessionService The service handling evaluation session business logic.
   */
  constructor(private readonly evaluationSessionService: EvaluationSessionService) {}

  /**
   * Retrieves all evaluation sessions, optionally filtered by module ID.
   *
   * @param moduleId Optional module ID to filter sessions.
   * @returns Promise resolving to an array of EvaluationSessionDTO objects.
   *
   * @example
   * GET /evaluation-sessions?moduleId=5
   */
  @Get()
  @roles('ANY')
  async findAll(@Query('moduleId') moduleId?: string): Promise<EvaluationSessionDTO[]> {
    return this.evaluationSessionService.findAll(moduleId ? Number(moduleId) : undefined);
  }

  /**
   * Retrieves a single evaluation session by its ID.
   *
   * @param id The ID of the evaluation session.
   * @returns Promise resolving to the EvaluationSessionDTO.
   *
   * @example
   * GET /evaluation-sessions/42
   */
  @Get(':id')
  @roles('ANY')
  async findOne(@Param('id') id: string): Promise<EvaluationSessionDTO> {
    return this.evaluationSessionService.findOne(Number(id));
  }

  /**
   * Creates a new evaluation session.
   *
   * Only users with the TEACHER or ADMIN role are authorized to perform this action.
   *
   * @param createDto The data transfer object containing session creation data.
   * @param req The request object containing the authenticated user.
   * @returns Promise resolving to the created EvaluationSessionDTO.
   *
   * @example
   * POST /evaluation-sessions
   * Body: { ... }
   */
  @Post()
  @roles('TEACHER', 'ADMIN')
  async create(
    @Body() createDto: CreateEvaluationSessionDTO,
    @Req() req: any,
  ): Promise<EvaluationSessionDTO> {
    return this.evaluationSessionService.create(createDto, req.user.id);
  }

  /**
   * Updates an existing evaluation session.
   *
   * Only users with the TEACHER or ADMIN role are authorized to perform this action.
   *
   * @param id The ID of the evaluation session to update.
   * @param updateDto The data transfer object containing updated session data.
   * @returns Promise resolving to the updated EvaluationSessionDTO.
   *
   * @example
   * PUT /evaluation-sessions/42
   * Body: { ... }
   */
  @Put(':id')
  @roles('TEACHER', 'ADMIN')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateEvaluationSessionDTO,
  ): Promise<EvaluationSessionDTO> {
    return this.evaluationSessionService.update(Number(id), updateDto);
  }

  /**
   * Deletes an evaluation session by its ID.
   *
   * Only users with the TEACHER or ADMIN role are authorized to perform this action.
   *
   * @param id The ID of the evaluation session to delete.
   * @returns Promise resolving to void.
   *
   * @example
   * DELETE /evaluation-sessions/42
   */
  @Delete(':id')
  @roles('TEACHER', 'ADMIN')
  async remove(@Param('id') id: string): Promise<void> {
    return this.evaluationSessionService.remove(Number(id));
  }

  /**
   * Switches the phase of an evaluation session (e.g., from DISCUSSION to EVALUATION).
   *
   * Only users with the TEACHER or ADMIN role are authorized to perform this action.
   *
   * @param id The ID of the evaluation session.
   * @param body The request body containing the new phase ('DISCUSSION' or 'EVALUATION').
   * @returns Promise resolving to the updated EvaluationSessionDTO.
   *
   * @example
   * POST /evaluation-sessions/42/switch-phase
   * Body: { "phase": "EVALUATION" }
   */
  @Post(':id/switch-phase')
  @roles('TEACHER', 'ADMIN')
  async switchPhase(
    @Param('id') id: string,
    @Body() body: { phase: 'DISCUSSION' | 'EVALUATION' },
  ): Promise<EvaluationSessionDTO> {
    return this.evaluationSessionService.switchPhase(Number(id), body.phase);
  }

  /**
   * Retrieves all evaluation categories associated with a specific evaluation session.
   *
   * Categories are used to organize discussions and ratings into thematic groups.
   *
   * @param id The ID of the evaluation session.
   * @returns Promise resolving to an array of EvaluationCategoryDTO objects, ordered by display order.
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
