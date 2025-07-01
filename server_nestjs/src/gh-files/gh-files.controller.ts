import { Controller, Get, Logger } from '@nestjs/common';
import { GhFilesService, GrasshopperFileInfo } from './gh-files.service';
import { Public } from '@/public.decorator'; // Import the Public decorator

@Controller('api/gh-files') // Base path for all routes in this controller
export class GhFilesController {
  private readonly logger = new Logger(GhFilesController.name);

  constructor(private readonly ghFilesService: GhFilesService) {}

  @Public() // Add this decorator to make the endpoint publicly accessible
  @Get()
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
