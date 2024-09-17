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

