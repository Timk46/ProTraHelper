import {
  Controller,
  Post,
  Get,
  Param,
  UseGuards,
  ParseIntPipe,
  HttpStatus,
  HttpCode
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/common/guards/jwt-auth.guard';
import { RhinoIntegrationService } from './rhino-integration.service';
import type { RhinoExecutionResultDTO } from '@DTOs/mcslider.dto';

@ApiTags('Rhino Integration')
@Controller('rhino')
@UseGuards(JwtAuthGuard)
export class RhinoIntegrationController {
  constructor(private readonly rhinoIntegrationService: RhinoIntegrationService) {}

  @Post('execute/:questionId')
  @ApiOperation({ summary: 'Execute Rhino for a specific question' })
  @ApiResponse({ status: 201, description: 'Rhino executed successfully', })
  @ApiResponse({ status: 404, description: 'Question not found or Rhino not enabled' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  async executeForQuestion(
    @Param('questionId', ParseIntPipe) questionId: number
  ): Promise<RhinoExecutionResultDTO> {
    return this.rhinoIntegrationService.executeRhinoForQuestion(questionId);
  }

  @Get('availability')
  @ApiOperation({ summary: 'Check Rhino availability on the system' })
  @ApiResponse({ status: 200, description: 'Availability status retrieved' })
  async checkAvailability(): Promise<{ available: boolean }> {
    const available = await this.rhinoIntegrationService.checkRhinoAvailability();
    return { available };
  }

  @Get('grasshopper-files')
  @ApiOperation({ summary: 'Get list of available Grasshopper files' })
  @ApiResponse({ status: 200, description: 'Files retrieved successfully' })
  async getAvailableFiles(): Promise<{ files: string[] }> {
    const files = await this.rhinoIntegrationService.getAvailableGrasshopperFiles();
    return { files };
  }

  @Post('cache/clear')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Clear Rhino integration cache' })
  @ApiResponse({ status: 204, description: 'Cache cleared successfully' })
  async clearCache(): Promise<void> {
    this.rhinoIntegrationService.clearCache();
  }
}
