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
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/common/guards/jwt-auth.guard';
import { MCSliderService } from './mcslider.service';
import type {
  MCSliderQuestionResponseDTO,
  MCSliderSubmissionResultDTO,
  RhinoExecutionResultDTO,
} from '@DTOs/mcslider.dto';
import {
  CreateMCSliderQuestionDTO,
  MCSliderSubmissionDTO,
  UpdateMCSliderQuestionDTO,
} from '@DTOs/mcslider.dto';

interface RequestWithUser extends Request {
  user: {
    id: number;
  };
}

@ApiTags('MCSlider')
@Controller('mcslider')
@UseGuards(JwtAuthGuard)
export class MCSliderController {
  constructor(private readonly mcSliderService: MCSliderService) {}

  @Post('questions')
  @ApiOperation({ summary: 'Create a new MCSlider question' })
  @ApiResponse({ status: 201, description: 'Question created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createQuestion(
    @Body() createDto: CreateMCSliderQuestionDTO,
    @Req() req: RequestWithUser,
  ): Promise<MCSliderQuestionResponseDTO> {
    return this.mcSliderService.createMCSliderQuestion(req.user.id, createDto);
  }

  @Get('questions')
  @ApiOperation({ summary: 'Get all MCSlider questions with pagination' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 20)',
  })
  @ApiQuery({
    name: 'userId',
    required: false,
    type: Number,
    description: 'Filter by author ID',
  })
  @ApiResponse({ status: 200, description: 'Questions retrieved successfully' })
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
  @ApiOperation({ summary: 'Get a specific MCSlider question' })
  @ApiResponse({ status: 200, description: 'Question retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Question not found' })
  async getQuestion(@Param('id', ParseIntPipe) id: number): Promise<MCSliderQuestionResponseDTO> {
    return this.mcSliderService.getMCSliderQuestion(id);
  }

  @Put('questions/:id')
  @ApiOperation({ summary: 'Update an MCSlider question' })
  @ApiResponse({ status: 200, description: 'Question updated successfully' })
  @ApiResponse({ status: 404, description: 'Question not found' })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  async updateQuestion(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateMCSliderQuestionDTO,
  ): Promise<MCSliderQuestionResponseDTO> {
    return this.mcSliderService.updateMCSliderQuestion(id, updateDto);
  }

  @Delete('questions/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an MCSlider question' })
  @ApiResponse({ status: 204, description: 'Question deleted successfully' })
  @ApiResponse({ status: 404, description: 'Question not found' })
  async deleteQuestion(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.mcSliderService.deleteMCSliderQuestion(id);
  }

  @Post('submit')
  @ApiOperation({ summary: 'Submit an MCSlider answer' })
  @ApiResponse({ status: 201, description: 'Answer submitted successfully' })
  @ApiResponse({ status: 400, description: 'Invalid submission data' })
  async submitAnswer(
    @Body() submissionDto: MCSliderSubmissionDTO,
    @Req() req: RequestWithUser,
  ): Promise<MCSliderSubmissionResultDTO> {
    return this.mcSliderService.submitMCSliderAnswer(req.user.id, submissionDto);
  }

  @Post('rhino/:id')
  @ApiOperation({ summary: 'Execute Rhino for an MCSlider question' })
  @ApiResponse({ status: 201, description: 'Rhino executed successfully' })
  @ApiResponse({ status: 400, description: 'Rhino integration not enabled' })
  @ApiResponse({ status: 404, description: 'Question not found' })
  async executeRhino(@Param('id', ParseIntPipe) id: number): Promise<RhinoExecutionResultDTO> {
    return this.mcSliderService.executeRhinoForMCSlider(id);
  }
}
