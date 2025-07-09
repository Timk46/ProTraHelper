export interface FileDto {
    id?: number;
    uniqueIdentifier: string;
    name: string;
    path: string;
    type: string;
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
  