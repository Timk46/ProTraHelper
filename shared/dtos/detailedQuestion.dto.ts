export interface detailedQuestionDTO {
  id: number;
  createdAt?: Date;
  updatedAt?: Date;
  name: string;
  description: string;
  score: number;
  type: string;
  level: number;
  mode: string;
  authorId: number;
  text: string;
  isApproved: boolean;
  version: number;
  originId: number;
  conceptNodeId?: number;

  codingQuestion?: detailedCodingQuestionDTO;
  freetextQuestion?: detailedFreetextQuestionDTO;
  mcQuestion?: detailedMcQuestionDTO;
  
}

export interface detailedCodingQuestionDTO {
  id: number;
  count_InputArgs: number;
  text: string;
  textHTML?: string;
  mainFileName: string;
  programmingLanguage: string;
  questionId: number;
  codeGeruests: detailedCodeGeruestDTO[];
}

export interface detailedCodeGeruestDTO {
  id: number;
  codingQuestionId: number;
  codeFileName: string;
  code: string;
  language: string;
}

export interface detailedFreetextQuestionDTO {
  id: number;
  textHTML: string;
  expectations: string;
  expectationsHTML?: string;
  exampleSolution?: string;
  exampleSolutionHTML?: string;
  createdAt?: Date;
  updatedAt?: Date;
  questionId: number;
}

export interface detailedMcQuestionDTO {
  id: number;
  createdAt?: Date;
  updatedAt?: Date;
  questionVersionId?: number; // unnecessary?
  questionId: number;
  shuffleoptions: boolean;
  isSC: boolean; // single choice
  mcOptions: detailedMcOptionDTO[];
}

export interface detailedMcOptionDTO {
  id: number;
  createdAt?: Date;
  updatedAt?: Date;
  text: string;
  is_correct: boolean;
}

