import { StreamableFile } from '@nestjs/common';
import {
  Controller,
  Get,
  Param,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProductionFilesService } from './production-files.service';
import { Response } from 'express';
import { RolesGuard, roles } from '@/auth/common/guards/roles.guard';

@UseGuards(RolesGuard)
@Controller('production-files')
export class ProductionFilesController {
  constructor(private readonly productionFilesService: ProductionFilesService) {}

  /**
   * Upload a new file to the production_uploads folder.
   *
   * POST /production-files/upload
   *
   * @param {Express.Multer.File} file - The file to upload
   * @param {number} moduleId - The module ID
   * @param {any} req - The request object containing user information
   * @param {number} questionId - Optional question ID for linking
   * @param {number} mCAnswerId - Optional MC answer ID for linking
   * @param {number} contentElementId - Optional content element ID for linking
   * @returns {Promise<FileDto>} The metadata of the uploaded file
   */
  @roles('ANY')
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadProductionFile(@UploadedFile() file: Express.Multer.File, @Req() req: any) {
    const { buffer, mimetype } = file;
    const fileName = file.originalname;
    const fileType = mimetype.split('/')[1];
    const userId = req.user.id;

    return await this.productionFilesService.uploadProductionFile(buffer, fileName, fileType);
  }

  /**
   * Download a file from the production_uploads folder by its unique identifier.
   *
   * GET /production-files/download/:uniqueIdentifier
   *
   * @param {string} uniqueIdentifier - The unique identifier of the file
   * @param {number} moduleId - The module ID for context validation
   * @param {any} req - The request object containing user information
   * @param {Response} response - The Express response object
   * @returns {StreamableFile} The StreamableFile for downloading
   */
  @roles('ANY')
  @Get('download/:uniqueIdentifier')
  async downloadProductionFile(
    @Param('uniqueIdentifier') uniqueIdentifier: string,
    @Req() req: any,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const userId = req.user.id;

    // Get file metadata first to set proper headers
    const file = await this.productionFilesService.getProductionFile(uniqueIdentifier);

    // Set response headers based on file type
    response.set({
      'Content-Type': file.type === 'pdf' ? 'application/pdf' : `application/${file.type}`,
      'Content-Disposition':
        file.type === 'pdf' ? `inline; filename=${file.name}` : `attachment; filename=${file.name}`,
      'X-Filename': file.name,
    });

    return this.productionFilesService.downloadProductionFile(uniqueIdentifier);
  }

  /**
   * Retrieve information about an existing production file.
   *
   * GET /production-files/:uniqueIdentifier
   *
   * @param {string} uniqueIdentifier - The unique identifier of the file
   * @returns {Promise<FileDto>} The metadata of the retrieved file
   */
  @roles('ANY')
  @Get(':uniqueIdentifier')
  async getProductionFile(@Param('uniqueIdentifier') uniqueIdentifier: string) {
    return await this.productionFilesService.getProductionFile(uniqueIdentifier);
  }
}
