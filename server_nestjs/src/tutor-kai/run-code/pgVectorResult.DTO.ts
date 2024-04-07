import { TranscriptChunk } from '@DTOs/index';

  export interface IpgVectorData {
    concept: string;
    question: string;
  }

  export interface IpgVectorContent {
    data: IpgVectorData;
    explanation: TranscriptChunk[];
  }
