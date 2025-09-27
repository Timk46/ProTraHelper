import { Injectable, NotFoundException, StreamableFile } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';
import { FileDto, filePrivacy, ProductionFileDTO, UserDTO } from '@DTOs/index';
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
    privacy: filePrivacy,
    userId: number,
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
        privacy,
      },
    });

    // TODO: Implement module association properly when modules are in place
    const module = await this.prisma.module.findFirst({});

    const fileUpload =await this.prisma.fileUpload.create({
      data: {
        file: { connect: { id: file.id } },
        user: { connect: { id: userId } },
        module: { connect: { id: module.id } },
      },
    });

    return {
      id: file.id,
      fileUploadId: fileUpload.id,
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
  async downloadProductionFile(uploadFileId: number): Promise<StreamableFile> {
    // Get file metadata from database
    const productionFile = await this.getProductionFile(uploadFileId);
    // Construct full file path
    const fullPath = process.env.FILE_PATH + productionFile.file.path;

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
  async getProductionFile(fileUploadId: number): Promise<ProductionFileDTO> {
    const fileUpload = await this.prisma.fileUpload.findUnique({
      where: { id: fileUploadId },
      select: { file: true, user: true, module: true, createdAt: true, updatedAt: true },
    });

    if (!fileUpload || !fileUpload.file) {
      throw new NotFoundException('File not found');
    }

    // Security check: Ensure file is in production_uploads folder
    if (!fileUpload.file.path.startsWith('production_uploads/')) {
      throw new NotFoundException('File not found in production uploads');
    }

    return {
      id: fileUpload.file.id,
      user: fileUpload.user as UserDTO,
      file: {
        id: fileUpload.file.id,
        uniqueIdentifier: fileUpload.file.uniqueIdentifier,
        name: fileUpload.file.name,
        path: fileUpload.file.path,
        type: fileUpload.file.type,
        privacy: fileUpload.file.privacy as filePrivacy,
      },
      module: fileUpload.module,
      createdAt: fileUpload.createdAt,
      updatedAt: fileUpload.updatedAt,
    };
  }

  async getUniqueIdentifierByUploadId(id: number): Promise<string> {
    const fileUpload = await this.prisma.fileUpload.findUnique({
      where: { id },
      select: { file: { select: { uniqueIdentifier: true } } },
    });
    if (!fileUpload) {
      throw new NotFoundException('File not found');
    }
    return fileUpload.file.uniqueIdentifier;
  }

  /**
   * Checks whether a user has access to a production file based on file privacy, user role, ownership, or group membership.
   *
   * @param fileUploadId - The unique identifier of the file upload.
   * @param user - The user object attempting to access the file.
   * @returns A promise that resolves to `true` if the user has access, otherwise `false`.
   *
   * The access is granted if:
   * - The file is public.
   * - The user has the 'ADMIN' role.
   * - The user is the owner of the file.
   * - The file is restricted and the user is a member of the same user group as the file owner.
   */
  async hasAccess(fileUploadId: number, user: any): Promise<boolean> {
    const productionFile = await this.getProductionFile(fileUploadId);
    if (productionFile.file.privacy === filePrivacy.PUBLIC || user.globalRole === 'ADMIN' || user.globalRole === 'TEACHER') {
      return true;
    }
    if (productionFile.user.id === user.id) {
      return true;
    }
    if (productionFile.file.privacy === filePrivacy.RESTRICTED) {
      // The file owner is in a UserGrop. Find all group members and check if the user is in one of these groups
      const groups = await this.prisma.userGroup.findMany({
        where: {
          UserGroupMembership: { some: { id: productionFile.user.id } },
        }, include: { UserGroupMembership: true },
      });
      return groups.some((group) => {
        if (group.UserGroupMembership.some((member) => member.id === user.id)) {
          return true;
        }
      }); 
    }
    return false;
  }
}
