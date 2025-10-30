import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
// Swagger-Import entfernt
import { JwtAuthGuard } from '../auth/common/guards/jwt-auth.guard';
import { AuthenticatedRequest } from '../auth/common/interfaces';
import { MCSliderService } from './mcslider.service';
import {
  MCSliderQuestionResponseDTO,
  MCSliderSubmissionResultDTO,
  RhinoExecutionResultDTO,
} from '@DTOs/mcslider.dto';
import {
  CreateMCSliderQuestionDTO,
  MCSliderSubmissionDTO,
  UpdateMCSliderQuestionDTO,
} from '@DTOs/mcslider.dto';

// Swagger-Dekoratoren entfernt
@Controller('mcslider')
@UseGuards(JwtAuthGuard)
export class MCSliderController {
  constructor(private readonly mcSliderService: MCSliderService) {}

  @Post('questions')
  async createQuestion(
    @Body() createDto: CreateMCSliderQuestionDTO,
    @Req() req: AuthenticatedRequest,
  ): Promise<MCSliderQuestionResponseDTO> {
    return this.mcSliderService.createMCSliderQuestion(req.user.id, createDto);
  }

  @Get('questions')
  async getAllQuestions(
    @Query('page', new ParseIntPipe()) page = 1,
    @Query('limit', new ParseIntPipe()) limit = 20,
    @Query('userId') userId?: number,
  ): Promise<{
    questions: MCSliderQuestionResponseDTO[];
    total: number;
    page: number;
    limit: number;
  }> {
    return this.mcSliderService.getAllMCSliderQuestions(page, limit, userId);
  }

  @Get('questions/:id')
  async getQuestion(@Param('id', ParseIntPipe) id: number): Promise<MCSliderQuestionResponseDTO> {
    return this.mcSliderService.getMCSliderQuestion(id);
  }

  @Put('questions/:id')
  async updateQuestion(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateMCSliderQuestionDTO,
  ): Promise<MCSliderQuestionResponseDTO> {
    return this.mcSliderService.updateMCSliderQuestion(id, updateDto);
  }

  @Delete('questions/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteQuestion(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.mcSliderService.deleteMCSliderQuestion(id);
  }

  @Post('submit')
  async submitAnswer(
    @Body() submissionDto: MCSliderSubmissionDTO,
    @Req() req: AuthenticatedRequest,
  ): Promise<MCSliderSubmissionResultDTO> {
    return this.mcSliderService.submitMCSliderAnswer(req.user.id, submissionDto);
  }

  @Post('rhino/:id')
  async executeRhino(@Param('id', ParseIntPipe) id: number): Promise<RhinoExecutionResultDTO> {
    return this.mcSliderService.executeRhinoForMCSlider(id);
  }
}
