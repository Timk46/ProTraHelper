import { Controller, Get, Logger } from '@nestjs/common';
import { GhFilesService, GrasshopperFileInfo } from './gh-files.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger'; // For API documentation
import { Public } from '@/public.decorator'; // Import the Public decorator

@ApiTags('Grasshopper Files') // Tag for Swagger UI
@Controller('api/gh-files') // Base path for all routes in this controller
export class GhFilesController {
  private readonly logger = new Logger(GhFilesController.name);

  constructor(private readonly ghFilesService: GhFilesService) {}

  @Public() // Add this decorator to make the endpoint publicly accessible
  @Get()
  @ApiOperation({ summary: 'Get a list of available Grasshopper (.gh) files' })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved the list of Grasshopper files.',
    // Ideally, create a DTO for GrasshopperFileInfo and reference it here
    // For example: type: [GrasshopperFileDto]
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'sample_model.gh' },
          name: { type: 'string', example: 'sample_model.gh' },
          path: {
            type: 'string',
            example: 'C:\\path\\to\\server_nestjs\\gh-files\\sample_model.gh',
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error while retrieving files.',
  })
  async getFiles(): Promise<GrasshopperFileInfo[]> {
    this.logger.log('Received request to get Grasshopper files.');
    try {
      const files = await this.ghFilesService.getGrasshopperFiles();
      return files;
    } catch (error) {
      this.logger.error('Error in getFiles controller method:', error);
      // NestJS will automatically handle this and return a 500 error
      // You could throw a more specific HttpException if needed
      throw error;
    }
  }
}
