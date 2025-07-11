import { Injectable, NotFoundException, StreamableFile } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';
import type { FileDto } from '@DTOs/index';
import * as fs from 'fs';
import { FilesService } from './files.service';

@Injectable()
export class ProductionFilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly filesService: FilesService,
  ) {}

  /**
   * Upload a new file to the production_uploads folder.
   *
   * @param {Buffer} fileBuffer - The file data as a Buffer
   * @param {string} fileName - The original file name
   * @param {string} fileType - The file type (e.g., 'pdf', 'mp4', 'png', 'jpg', 'gif')
   * @returns {Promise<FileDto>} The metadata of the uploaded file
   */
  async uploadProductionFile(
    fileBuffer: Buffer,
    fileName: string,
    fileType: string,
  ): Promise<FileDto> {
    // Create unique file identifier
    const uniqueIdentifier = uuidv4();
    const folderName = 'production_uploads';
    const filePath = `${folderName}/${uniqueIdentifier}.${fileType}`;
    const fullPath = process.env.FILE_PATH + filePath;

    // Create directory if it doesn't exist
    const dirPath = process.env.FILE_PATH + folderName;
    await fs.promises.mkdir(dirPath, { recursive: true });

    // Write file to disk
    await fs.promises.writeFile(fullPath, fileBuffer);

    // Create database entry
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
   * Download a file from the production_uploads folder by its unique identifier.
   *
   * @param {string} uniqueIdentifier - The unique identifier of the file
   * @param {number} userId - The user ID requesting the file (for access control)
   * @param {number} moduleId - The module ID for additional context validation
   * @returns {Promise<StreamableFile>} The StreamableFile for downloading
   */
  async downloadProductionFile(uniqueIdentifier: string): Promise<StreamableFile> {
    // Get file metadata from database
    const file = await this.prisma.file.findUnique({
      where: { uniqueIdentifier },
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    // Security check: Ensure file is in production_uploads folder
    if (!file.path.startsWith('production_uploads/')) {
      throw new NotFoundException('File not found in production uploads');
    }

    // Construct full file path
    const fullPath = process.env.FILE_PATH + file.path;

    // Check if file exists on disk
    if (!fs.existsSync(fullPath)) {
      throw new NotFoundException('File does not exist on disk');
    }

    const fileStream = fs.createReadStream(fullPath);
    return new StreamableFile(fileStream);
  }

  /**
   * Retrieve information about an existing production file.
   *
   * @param {string} uniqueIdentifier - The unique identifier of the file
   * @returns {Promise<FileDto>} The metadata of the retrieved file
   */
  async getProductionFile(uniqueIdentifier: string): Promise<FileDto> {
    const file = await this.prisma.file.findUnique({
      where: { uniqueIdentifier },
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    // Security check: Ensure file is in production_uploads folder
    if (!file.path.startsWith('production_uploads/')) {
      throw new NotFoundException('File not found in production uploads');
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
