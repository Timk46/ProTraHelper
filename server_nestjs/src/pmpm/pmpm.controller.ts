import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Param,
  Logger,
  HttpException,
  HttpStatus
} from '@nestjs/common';
import { PmpmService } from './pmpm.service';
import { JwtAuthGuard } from '@/auth/common/guards/jwt-auth.guard';
import { CreatePmpmSessionDto } from './dto/create-pmpm-session.dto';

@Controller('pmpm')
export class PmpmController {
  private readonly logger = new Logger(PmpmController.name);

  constructor(private readonly pmpmService: PmpmService) {}

  /**
   * Creates a new PMPM session with a temporary connection to Guacamole
   * Returns a token and connection details for the frontend
   */
  @UseGuards(JwtAuthGuard)
  @Post('session')
  async createSession(@Body() createSessionDto: CreatePmpmSessionDto) {
    try {
      this.logger.log(`Creating PMPM session for model: ${createSessionDto.modelId}`);
      const session = await this.pmpmService.createSession(createSessionDto);
      return session;
    } catch (error) {
      this.logger.error(`Failed to create PMPM session: ${error.message}`, error.stack);
      throw new HttpException(
        'Failed to create PMPM session',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Gets the status of an ongoing session
   */
  @UseGuards(JwtAuthGuard)
  @Get('session/:sessionId/status')
  async getSessionStatus(@Param('sessionId') sessionId: string) {
    try {
      return await this.pmpmService.getSessionStatus(sessionId);
    } catch (error) {
      this.logger.error(`Failed to get session status: ${error.message}`, error.stack);
      throw new HttpException(
        'Failed to get session status',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
