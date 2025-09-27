import { ModuleDTO } from "./module.dto";
import { UserDTO } from "./user.dto";

export interface FileDto {
  id?: number;
  fileUploadId?: number;
  uniqueIdentifier?: string;
  name: string;
  path?: string;
  type: string;
  privacy?: filePrivacy;
}

export interface ProductionFileDTO {
  id: number;
  user: UserDTO;
  file: FileDto;
  module: ModuleDTO;
  createdAt: Date;
  updatedAt: Date;
}

export interface FileUploadDTO {
  file: string;
  name: string;
  type: string;
}

export interface TranscriptChunk {
  TranscriptChunkContent: string;
  metadata: {
    filename: string;
    timestamp: string;
    markdownLink: string;
    uuid: string;
    lectureName: string;
    relevanceScore?: number; // Added optional relevance score from reranker
  };
}

export enum filePrivacy {
  PRIVATE = 'PRIVATE', // default, only owner has access
  PUBLIC = 'PUBLIC', // everyone has access
  RESTRICTED = 'RESTRICTED', // only owner, admins and group members have access
}
