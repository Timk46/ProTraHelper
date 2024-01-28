export interface IpgVectorExplanationMetadata {
    source: string;
    filename: string;
    timestamp: string;
    uuid: string;
  }

  export interface IpgVectorExplanation {
    pageContent: string;
    metadata: IpgVectorExplanationMetadata;
  }

  export interface IpgVectorData {
    concept: string;
    question: string;
  }

  export interface IpgVectorContent {
    data: IpgVectorData;
    explanation: IpgVectorExplanation[];
  }
