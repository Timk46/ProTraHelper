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
   * POST /files/upload   DISABLED FOR NOW
   *
   * @param {Express.Multer.File} file - The file to upload
   * @returns {Promise<FileDto>} The metadata of the uploaded file
   */
  /*
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    const { buffer, mimetype } = file;
    const fileName = file.originalname;
    const fileType = mimetype.split('/')[1];

    return await this.filesService.uploadFile(buffer, fileName, fileType);
  }*/

  /**
   * Download an existing file by its unique identifier.
   *
   * GET /files/download/:uniqueIdentifier
   *
   * @param {string} uniqueIdentifier - The unique identifier of the file
   * @param {Response} response - The Express response object
   * @returns {StreamableFile} The StreamableFile for downloading
   */
  @Public()
  @Get('download/:uniqueIdentifier')
  async downloadFile(
    @Param('uniqueIdentifier') uniqueIdentifier: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const file = await this.filesService.getFile(uniqueIdentifier);
    console.log('File to download:', file.type, file.type == 'PDF');
    // If the file is a PDF, set the content type to 'application/pdf' and content-Disposition Header to inline instead of attachment (to open the PDF in the browser instead of downloading it)
    response.set({
      'Content-Type': file.type.toLowerCase() == 'pdf' ? 'application/pdf' : file.type,
      'Content-Disposition': file.type.toLowerCase() == 'pdf' ? `inline; filename=${file.name}` : `attachment; filename=${file.name}`,
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

  /**
 * Handles requests for video file downloads. Supports full and partial (range) requests.
 *
 * @route GET /download/Video/:uniqueIdentifier
 * @public
 * @param uniqueIdentifier The unique identifier of the video file to download.
 * @param response The response object, used for setting headers and status codes.
 * @param range The range header from the request, specifying the part of the video to download.
 * @returns A StreamableFile object containing the video stream.
 */
@Public()
@Get('download/Video/:uniqueIdentifier')
async downloadVideo(
  @Param('uniqueIdentifier') uniqueIdentifier: string, // Extracts the video's unique identifier from the URL.
  @Res({ passthrough: true }) response: Response, // Injects the response object for direct manipulation.
  @Headers('range') range: string, // Extracts the 'Range' header from the request.
): Promise<StreamableFile> {
  // Retrieves the file based on the unique identifier.
  const file = await this.filesService.getFile(uniqueIdentifier);
  // Determines the file size for setting appropriate headers.
  const fileSize = fs.statSync(process.env.FILE_PATH + file.path).size;

  // Checks if a range request was made. This is needed for "streaming" the video.
  if (range) {
    // Parses the range header to determine the requested segment of the file.
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    // Sets headers specific to range requests.
    response.set({
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': end - start + 1,
      'Content-Type': 'video/mp4',
    });

    response.status(206); // Indicates partial content.

    // Creates a readable stream for the requested segment.
    const fileStream = fs.createReadStream(
      process.env.FILE_PATH + file.path,
      { start, end },
    );
    return new StreamableFile(fileStream);
  } else {
    // Sets headers for a full file response.
    response.set({
      'Content-Length': fileSize,
      'Content-Type': 'video/mp4',
    });
    // Creates a readable stream for the entire file.
    const fileStream = fs.createReadStream(process.env.FILE_PATH + file.path);
    return new StreamableFile(fileStream);
  }
}


  /**
   * Downloads a video file by its name. CAREFUL: If there is a double, it will take the first one.
   *
   * @param name - The name of the video file to download.
   * @param response - The HTTP response object, used to set headers and status.
   * @param range - The 'Range' header from the request, used for partial file downloads.
   * @returns A StreamableFile object containing the video stream.
   */
  @Public()
  @Get('download/VideoByName/:name')
  async downloadVideoByName(
    @Param('name') name: string, // Extracts the video's unique identifier from the URL.
    @Res({ passthrough: true }) response: Response, // Injects the response object for direct manipulation.
    @Headers('range') range: string, // Extracts the 'Range' header from the request.
  ): Promise<StreamableFile> {
    // Retrieves the file based on the unique identifier.
    const file = await this.filesService.getFileByName(name);
    // Determines the file size for setting appropriate headers.
    const fileSize = fs.statSync(process.env.FILE_PATH + file.path).size;

    // Checks if a range request was made. This is needed for "streaming" the video.
    if (range) {
      // Parses the range header to determine the requested segment of the file.
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      // Sets headers specific to range requests.
      response.set({
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': end - start + 1,
        'Content-Type': 'video/mp4',
      });

      response.status(206); // Indicates partial content.

      // Creates a readable stream for the requested segment.
      const fileStream = fs.createReadStream(
        process.env.FILE_PATH + file.path,
        { start, end },
      );
      return new StreamableFile(fileStream);
    } else {
      // Sets headers for a full file response.
      response.set({
        'Content-Length': fileSize,
        'Content-Type': 'video/mp4',
      });
      // Creates a readable stream for the entire file.
      const fileStream = fs.createReadStream(process.env.FILE_PATH + file.path);
      return new StreamableFile(fileStream);
    }
  }

}
