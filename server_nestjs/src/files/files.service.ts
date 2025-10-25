import { Injectable, NotFoundException, StreamableFile } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';
import { FileDto, filePrivacy, userDTO } from '@DTOs/index';
import * as fs from 'fs';

@Injectable()
export class FilesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Upload a new public file.
   *
   * @param {Buffer} fileBuffer - The file data as a Buffer
   * @param {string} fileType - The file type (e.g., 'pdf', 'mp4', 'png', 'jpg', 'gif')
   * @returns {Promise<FileDto>} The metadata of the uploaded file
   */
  async uploadFile(fileBuffer: Buffer, fileName: string, fileType: string): Promise<FileDto> {
    const uniqueIdentifier = uuidv4();
    const filePath = `${uniqueIdentifier}.${fileType}`;

    await fs.promises.writeFile(process.env.FILE_PATH + filePath, fileBuffer);

    const file = await this.prisma.file.create({
      data: {
        uniqueIdentifier,
        name: fileName,
        path: filePath,
        type: fileType,
        privacy: filePrivacy.PUBLIC,
      },
    });

    // TODO: Implement module association properly when modules are in place
    /* const module = await this.prisma.module.findFirst({});

    if (privacy !== filePrivacy.PUBLIC) {
      await this.prisma.fileUpload.create({
        data: {
          file: { connect: { id: file.id } },
          user: { connect: { id: userId } },
          module: { connect: { id: module.id } },
        },
      });
    } */

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
  async downloadFile(
    uniqueIdentifier: string,
    userId: number = undefined,
  ): Promise<StreamableFile> {
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
      privacy: file.privacy as filePrivacy,
    };
  }

  /**
   * Download a file by its name (returns first file with the given name)
   *
   * @param {string} uniqueIdentifier - The unique identifier of the file
   * @returns {StreamableFile} The StreamableFile for downloading
   */
  /* async downloadFileByName(uniqueIdentifier: string): Promise<StreamableFile> {
    const file: FileDto = await this.getFileByName(uniqueIdentifier);
    console.log('downloadFileByName A');
    console.log(JSON.stringify(file));
    const filePath = process.env.FILE_PATH + file.path;

    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('File does not exist');
    }

    const fileStream = fs.createReadStream(filePath);
    console.log('downloadFileByName B');
    console.log(JSON.stringify(filePath));
    return new StreamableFile(fileStream);
  } */

  /**
   * Retrieve information about the first existing file with the given name.
   *
   * @param {string} name - The name of the file
   * @returns {Promise<FileDto>} The metadata of the retrieved file
   */
  /* async getFileByName(name: string): Promise<FileDto> {
    const file = await this.prisma.file.findFirst({
      where: { name },
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
  } */

  /**
   * Checks whether the specified user has access to a file identified by its unique identifier.
   *
   * Access is granted if the file is public or if the user has the 'ADMIN' role.
   *
   * @param fileUniqueIdentifier - The unique identifier of the file to check access for.
   * @param user - The user object containing user information, including their role.
   * @returns A promise that resolves to `true` if the user has access to the file, otherwise `false`.
   */
  async hasAccess(fileUniqueIdentifier: string, user: any): Promise<boolean> {
    console.log('hasAccess: ', fileUniqueIdentifier, user.globalRole);
    const file = await this.getFile(fileUniqueIdentifier);
    if (
      file.privacy === filePrivacy.PUBLIC ||
      user.globalRole === 'ADMIN' ||
      user.globalRole === 'TEACHER'
    ) {
      return true;
    }
    return false;
  }
}
