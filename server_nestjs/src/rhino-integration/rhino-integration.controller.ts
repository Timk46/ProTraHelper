import {
  Controller,
  Post,
  Get,
  Param,
  UseGuards,
  ParseIntPipe,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
// Swagger-Import entfernt
import { JwtAuthGuard } from '../auth/common/guards/jwt-auth.guard';
import { RhinoIntegrationService } from './rhino-integration.service';
import { RhinoExecutionResultDTO } from '@DTOs/mcslider.dto';

// Swagger-Dekoratoren entfernt
@Controller('rhino')
@UseGuards(JwtAuthGuard)
export class RhinoIntegrationController {
  constructor(private readonly rhinoIntegrationService: RhinoIntegrationService) {}

  @Post('execute/:questionId')
  async executeForQuestion(
    @Param('questionId', ParseIntPipe) questionId: number,
  ): Promise<RhinoExecutionResultDTO> {
    return this.rhinoIntegrationService.executeRhinoForQuestion(questionId);
  }

  @Get('availability')
  async checkAvailability(): Promise<{ available: boolean }> {
    const available = await this.rhinoIntegrationService.checkRhinoAvailability();
    return { available };
  }

  @Get('grasshopper-files')
  async getAvailableFiles(): Promise<{ files: string[] }> {
    const files = await this.rhinoIntegrationService.getAvailableGrasshopperFiles();
    return { files };
  }

  @Post('cache/clear')
  @HttpCode(HttpStatus.NO_CONTENT)
  async clearCache(): Promise<void> {
    this.rhinoIntegrationService.clearCache();
  }
}
