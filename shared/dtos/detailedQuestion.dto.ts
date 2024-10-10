import {CodingQuestionInternal} from './question.dto';
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

  codingQuestion?: CodingQuestionInternal;
  freetextQuestion?: detailedFreetextQuestionDTO;
  mcQuestion?: detailedChoiceQuestionDTO;
  fillinQuestion?: detailedFillinQuestionDTO;
}

export interface detailedFreetextQuestionDTO {
  id?: number;
  textHTML?: string;
  expectations: string;
  expectationsHTML?: string;
  exampleSolution?: string;
  exampleSolutionHTML?: string;
  createdAt?: Date;
  updatedAt?: Date;
  questionId: number;
}

export interface detailedChoiceQuestionDTO {
  id?: number;
  createdAt?: Date;
  updatedAt?: Date;
  questionVersionId?: number; // unnecessary?
  questionId: number;
  textHTML?: string;
  shuffleoptions: boolean;
  isSC: boolean; // single choice
  mcOptions: detailedChoiceOptionDTO[];
}

export interface detailedChoiceOptionDTO {
  id?: number;
  createdAt?: Date;
  updatedAt?: Date;
  text: string;
  is_correct: boolean;
}

export interface detailedFillinQuestionDTO {
  id?: number;
  createdAt?: Date;
  updatedAt?: Date;
  questionId?: number;
  authorId?: number;
  content: string;
  table?: boolean;
  taskType: string;
  blanks: detailedFillinBlankDTO[];
}

export interface detailedFillinBlankDTO {
  id?: number;
  createdAt?: Date;
  updatedAt?: Date;
  blankContent: string;
  position?: string;
  isDistractor: boolean;
  isCorrect: boolean;
  fillinQuestionId?: number;
}

