import {
  Controller,
  Get,
  Param,
  Post,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
  Body,
  Req,
  UseGuards
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
  async uploadProductionFile(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    const { buffer, mimetype } = file;
    const fileName = file.originalname;
    const fileType = mimetype.split('/')[1];
    const userId = req.user.id;

    return await this.productionFilesService.uploadProductionFile(
      buffer,
      fileName,
      fileType,
    );
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

    // Map file extensions/types to proper MIME types
    const mimeTypeMap: Record<string, string> = {
      pdf: 'application/pdf',
      PDF: 'application/pdf',
      mp4: 'video/mp4',
      MP4: 'video/mp4',
      png: 'image/png',
      PNG: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      JPG: 'image/jpeg',
      JPEG: 'image/jpeg',
      gif: 'image/gif',
      GIF: 'image/gif',
      txt: 'text/plain',
      TXT: 'text/plain',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      DOCX: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      XLSX: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      csv: 'text/csv',
      CSV: 'text/csv',
    };
    let mimeType = mimeTypeMap[file.type] || file.type;
    if (!mimeType.includes('/')) {
      mimeType = 'application/octet-stream';
    }
    const isPdf = mimeType === 'application/pdf';



    response.set({
      'Content-Type': mimeType,
      'Content-Disposition': isPdf ? `inline; filename="${file.name}"` : `attachment; filename="${file.name}"`,
      'X-Filename': file.name,
    });

    // Logge erfolgreichen Download-Vorgang mit Nutzer und Dateiname
    // eslint-disable-next-line no-console
    console.log(`[Download] User ${userId} downloaded file '${file.name}' (${file.uniqueIdentifier})`);
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
