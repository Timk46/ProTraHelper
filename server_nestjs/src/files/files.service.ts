import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FileDto } from '@DTOs/index';

/**
 * A service that provides functionalities related to file operations.
 */
@Injectable()
export class FilesService {

  constructor(private prisma: PrismaService) {}

  /**
   * Stores a new file record in the database using data from the provided DTO.
   *
   * @param {FileDto} filedto - Data transfer object containing file details.
   */
  async saveFilePath(filedto: FileDto) {
    return this.prisma.file.create({
      data: {
        name: filedto.name,
        path: filedto.path,
        type: filedto.type,
      },
    });
  }

  /**
   * Fetches the details of a file by its ID.
   *
   * @param {number} fileId - The unique identifier of the file.
   * @returns {Promise<FileDto>} A promise that resolves with the file details or null if not found.
   */
  async getFilePathById(fileId: number): Promise<FileDto> {
    const file = await this.prisma.file.findUnique({
      where: {
        id: Number(fileId),
      },
    });
    return { name: file.name, path: file.path, type: file.type };
  }

    /**
   * Fetches the details of a file by its ID.
   *
   * @param {number} fileId - The unique identifier of the file.
   * @returns {Promise<FileDto>} A promise that resolves with the file details or null if not found.
   */
    async getFilePathByName(fileId: number): Promise<FileDto> {
      const file = await this.prisma.file.findUnique({
        where: {
          id: Number(fileId),
        },
      });
      return { name: file.name, path: file.path, type: file.type };
    }
}
