import { Controller, Get, Param, Res } from '@nestjs/common';
import { FilesService } from './files.service';
import { FileDto } from '@DTOs/index';

import { Response } from 'express';
import { join } from 'path';


@Controller('files')
export class FilesController {

  constructor(private filesService: FilesService) {}

  /**
   * Endpoint to retrieve a file by its ID. The file path is fetched from the service,
   * and if it exists, the file is sent in the response.
   *
   * @route GET /files/:id
   *
   * @param {number} id - The unique identifier of the file.
   * @param {Response} res - Express response object.
   * @returns {Response} - A response containing the file or a 404 status if the file is not found.
   */
  @Get(':id')
  async getFile(@Param('id') id: number, @Res() res: Response) {
    const file: FileDto = await this.filesService.getFilePathById(id);

    if (!file.path) {
      return res.status(404).send('File not found');
    }

    const storagePath = join('dist/storage');
    return res.sendFile(file.path, { root: storagePath });
  }
}
