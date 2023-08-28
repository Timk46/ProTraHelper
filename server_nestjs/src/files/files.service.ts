import { Injectable, NotFoundException, StreamableFile } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';
import { FileDto } from '@DTOs/index';
import * as fs from 'fs';

@Injectable()
export class FilesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Upload a new file.
   *
   * @param {Buffer} fileBuffer - The file data as a Buffer
   * @param {string} fileType - The file type (e.g., 'pdf', 'mp4', 'png', 'jpg', 'gif')
   * @returns {Promise<FileDto>} The metadata of the uploaded file
   */
  async uploadFile(
    fileBuffer: Buffer,
    fileName: string,
    fileType: string,
  ): Promise<FileDto> {
    const uniqueIdentifier = uuidv4();
    const filePath = `${uniqueIdentifier}.${fileType}`;

    await fs.promises.writeFile(process.env.FILE_PATH + filePath, fileBuffer);

    const file = await this.prisma.file.create({
      data: {
        uniqueIdentifier,
        name: fileName,
        path: filePath,
        type: fileType,
      },
    });

    return {
      id: file.id,
      uniqueIdentifier: file.uniqueIdentifier,
      name: file.name,
      path: file.path,
      type: file.type,
    };
  }

  /**
   * Download a file by its unique identifier.
   *
   * @param {string} uniqueIdentifier - The unique identifier of the file
   * @returns {StreamableFile} The StreamableFile for downloading
   */
  async downloadFile(uniqueIdentifier: string): Promise<StreamableFile> {
    const file: FileDto = await this.getFile(uniqueIdentifier);
    const filePath = process.env.FILE_PATH + file.path;

    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('File does not exist');
    }

    const fileStream = fs.createReadStream(filePath);
    return new StreamableFile(fileStream);
  }

  /**
   * Retrieve information about an existing file.
   *
   * @param {string} uniqueIdentifier - The unique identifier of the file
   * @returns {Promise<FileDto>} The metadata of the retrieved file
   */
  async getFile(uniqueIdentifier: string): Promise<FileDto> {
    const file = await this.prisma.file.findUnique({
      where: { uniqueIdentifier },
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    return {
      id: file.id,
      uniqueIdentifier: file.uniqueIdentifier,
      name: file.name,
      path: file.path,
      type: file.type,
    };
  }
}
