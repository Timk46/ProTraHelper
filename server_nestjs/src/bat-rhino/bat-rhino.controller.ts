import { Controller, Post, Get, Body, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { BatScriptGeneratorService } from './bat-script-generator.service';
import type {
  BatExecutionResult,
  RhinoPathValidationResult,
} from '../../../shared/dtos/bat-rhino.dto';
import { BatScriptRequest } from '../../../shared/dtos/bat-rhino.dto';

/**
 * BatRhinoController
 * REST API Controller für .bat-Skript-basierte Rhino-Integration
 * Bietet Endpunkte für direkte Rhino-Ausführung und Skript-Generierung
 */
@Controller('api/rhino')
export class BatRhinoController {
  private readonly logger = new Logger(BatRhinoController.name);

  constructor(private readonly batScriptGeneratorService: BatScriptGeneratorService) {}

  /**
   * Führt Rhino direkt aus (Ein-Klick-Lösung)
   * POST /api/rhino/launch-direct
   */
  @Post('launch-direct')
  async launchDirect(@Body() request: any): Promise<BatExecutionResult> {
    this.logger.log(`Direct Rhino launch requested for file: ${request.filePath}`);

    try {
      // Map frontend request to backend format
      const batRequest: BatScriptRequest = {
        filePath: request.filePath || 'C:\\Dev\\hefl\\files\\Grasshopper\\example.gh',
        command: `_-Grasshopper B D W L W H D O "${
          request.filePath || 'C:\\Dev\\hefl\\files\\Grasshopper\\example.gh'
        }" W _MaxViewport _Enter`,
        rhinoPath: request.rhinoPath,
        batchMode: request.batchMode !== false,
        showViewport: request.showViewport !== false,
        userId: 'web-user',
      };

      // Execute Rhino directly
      const result = await this.batScriptGeneratorService.executeRhinoDirectly(batRequest);

      this.logger.log(`Direct Rhino launch ${result.success ? 'successful' : 'failed'}`);
      return result;
    } catch (error) {
      this.logger.error(`Direct Rhino launch failed: ${error.message}`, error.stack);
      throw new HttpException(
        `Fehler bei der direkten Rhino-Ausführung: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Generiert .bat-Skript für Download
   * POST /api/rhino/generate-script
   */
  @Post('generate-script')
  async generateScript(@Body() request: BatScriptRequest): Promise<BatExecutionResult> {
    this.logger.log(`Script generation requested for file: ${request.filePath}`);

    try {
      const result = await this.batScriptGeneratorService.generateBatScript(request);

      this.logger.log(`Script generation ${result.success ? 'successful' : 'failed'}`);
      return result;
    } catch (error) {
      this.logger.error(`Script generation failed: ${error.message}`, error.stack);
      throw new HttpException(
        `Fehler bei der Skript-Generierung: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Erkennt automatisch Rhino-Installation
   * GET /api/rhino/detect-rhino-path
   */
  @Get('detect-rhino-path')
  async detectRhinoPath(): Promise<RhinoPathValidationResult> {
    this.logger.log('Rhino path detection requested');

    try {
      const rhinoPath = await this.batScriptGeneratorService.detectRhinoPath();

      if (rhinoPath) {
        const validation = await this.batScriptGeneratorService.validateRhinoPath(rhinoPath);
        this.logger.log(`Rhino detected at: ${rhinoPath}`);
        return validation;
      } else {
        this.logger.warn('No Rhino installation detected');
        return {
          isValid: false,
          message: 'Keine Rhino-Installation gefunden. Bitte installieren Sie Rhino 8.',
        };
      }
    } catch (error) {
      this.logger.error(`Rhino path detection failed: ${error.message}`, error.stack);
      throw new HttpException(
        `Fehler bei der Rhino-Erkennung: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Überprüft Setup-Status
   * GET /api/rhino/setup-status
   */
  @Get('setup-status')
  async getSetupStatus(): Promise<any> {
    this.logger.log('Setup status requested');

    try {
      const rhinoPath = await this.batScriptGeneratorService.detectRhinoPath();
      const rhinoDetected = !!rhinoPath;

      let rhinoVersion = 'Unknown';
      if (rhinoDetected) {
        const validation = await this.batScriptGeneratorService.validateRhinoPath(rhinoPath);
        rhinoVersion = validation.version || 'Unknown';
      }

      const status = {
        rhinoDetected,
        rhinoPath,
        rhinoVersion,
        canGenerateScripts: rhinoDetected,
        message: rhinoDetected
          ? 'Rhino erkannt - Bat-Skript-System bereit'
          : 'Rhino nicht gefunden - Bitte installieren Sie Rhino 8',
      };

      this.logger.log(`Setup status: ${JSON.stringify(status)}`);
      return status;
    } catch (error) {
      this.logger.error(`Setup status check failed: ${error.message}`, error.stack);
      throw new HttpException(
        `Fehler bei der Setup-Status-Prüfung: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Health Check Endpoint
   * GET /api/rhino/health
   */
  @Get('health')
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
    };
  }
}
