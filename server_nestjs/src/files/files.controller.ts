import {
  Controller,
  Get,
  Param,
  Post,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
  Headers
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FilesService } from './files.service';
import { Response } from 'express';
import * as fs from 'fs';
import { Public } from '../public.decorator';

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
   * Download an existing file by its name
   *
   * GET /files/download/:name
   *
   * @param {string} name - The unique identifier of the file
   * @param {Response} response - The Express response object
   * @returns {StreamableFile} The StreamableFile for downloading
   */
  @Get('download/byName/:name')
  async downloadFileByName(
    @Param('name') name: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const file = await this.filesService.getFileByName(name);

    response.set({
      'Content-Type': file.type,
      'Content-Disposition': `attachment; filename=${file.name}`,
      'X-Filename': file.name, // additional header with filename because Angular's HttpClient cant access the filename from the response while using responseType: 'blob'
    });

    return this.filesService.downloadFileByName(name);
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

  @Public()
  @Get('download/Video/:uniqueIdentifier')
  async downloadVideo(
    @Param('uniqueIdentifier') uniqueIdentifier: string,
    @Res({ passthrough: true }) response: Response,
    @Headers('range') range: string, // Empfange den Range Header vom Client
  ): Promise<StreamableFile> {
    const file = await this.filesService.getFile(uniqueIdentifier);
    const fileSize = fs.statSync(process.env.FILE_PATH + file.path).size;

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      response.set({
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': end - start + 1,
        'Content-Type': 'video/mp4', // Stelle sicher, dass du den korrekten MIME-Typ setzt
      });

      response.status(206); // Partial Content

      const fileStream = fs.createReadStream(
        process.env.FILE_PATH + file.path,
        { start, end },
      );
      return new StreamableFile(fileStream);
    } else {
      response.set({
        'Content-Length': fileSize,
        'Content-Type': 'video/mp4', // Stelle sicher, dass du den korrekten MIME-Typ setzt
      });
      const fileStream = fs.createReadStream(process.env.FILE_PATH + file.path);
      return new StreamableFile(fileStream);
    }
  }
}
