import {
  Controller,
  Get,
  Param,
  Post,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FilesService } from './files.service';
import { Response } from 'express';

@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  /**
   * Upload a new file.
   *
   * POST /files/upload
   *
   * @param {Express.Multer.File} file - The file to upload
   * @returns {Promise<FileDto>} The metadata of the uploaded file
   */
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    const { buffer, mimetype } = file;
    const fileName = file.originalname;
    const fileType = mimetype.split('/')[1];

    return await this.filesService.uploadFile(buffer, fileName, fileType);
  }

  /**
   * Download an existing file by its unique identifier.
   *
   * GET /files/download/:uniqueIdentifier
   *
   * @param {string} uniqueIdentifier - The unique identifier of the file
   * @param {Response} response - The Express response object
   * @returns {StreamableFile} The StreamableFile for downloading
   */
  @Get('download/:uniqueIdentifier')
  async downloadFile(
    @Param('uniqueIdentifier') uniqueIdentifier: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const file = await this.filesService.getFile(uniqueIdentifier);

    response.set({
      'Content-Type': file.type,
      'Content-Disposition': `attachment; filename=${file.name}`,
      'X-Filename': file.name, // additional header with filename because Angular's HttpClient cant access the filename from the response while using responseType: 'blob'
    });

    return this.filesService.downloadFile(uniqueIdentifier);
  }

  /**
   * Retrieve an existing file by its unique identifier.
   *
   * GET /files/:uniqueIdentifier
   *
   * @param {string} uniqueIdentifier - The unique identifier of the file
   * @returns {Promise<FileDto>} The metadata of the retrieved file
   */
  @Get(':uniqueIdentifier')
  async getFile(@Param('uniqueIdentifier') uniqueIdentifier: string) {
    return await this.filesService.getFile(uniqueIdentifier);
  }
}
