import {
  CodingQuestionInternal,
  questionType,
  CodeGameQuestionDto,
} from "./question.dto";
import { GraphConfigurationDTO, GraphStructureDTO } from "./graphTask.dto";
import { editorDataDTO, taskSettingsDTO } from "./umlearnDtos/dtos";
import { GroupReviewGateCategoriesDTO } from "./group-review-gate.dto";

export interface detailedQuestionDTO {
  id: number;
  createdAt?: Date;
  updatedAt?: Date;
  name: string;
  description: string;
  score: number;
  type: questionType;
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
  graphQuestion?: detailedGraphQuestionDTO;
  umlQuestion?: detailedUmlQuestionDTO;
  codeGameQuestion?: CodeGameQuestionDto;
  uploadQuestion?: detailedUploadQuestionDTO;
  groupReviewGate?: detailedGroupReviewGateDTO;
  groupReviewStatuses?: GroupReviewStatusDTO[];
  questionCollection?: detailedQuestionCollectionDTO;
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
  additionalInfo?: string[]; // array of additional information texts
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

export interface detailedGraphQuestionDTO {
  id?: number;
  textHTML?: string;
  expectations: string;
  expectationsHTML?: string;
  type: string;
  initialStructure: GraphStructureDTO;
  exampleSolution: GraphStructureDTO[];
  stepsEnabled: boolean;
  configuration: GraphConfigurationDTO;
  createdAt?: Date;
  updatedAt?: Date;
  questionId: number;
}

export interface detailedUmlQuestionDTO {
  id?: number;
  questionId?: number;
  title?: string;
  text?: string;
  textHTML?: string;
  editorData?: editorDataDTO;
  startData?: editorDataDTO;
  dataImage?: string;
  taskSettings?: taskSettingsDTO;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface detailedUploadQuestionDTO {
  id?: number;
  questionId: number;
  title?: string;
  text?: string;
  textHTML?: string;
  maxSize: number;
  fileType: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface detailedGroupReviewGateDTO {
  id?: number;
  questionId: number;
  linkedQuestionId: number;
  linkedCategories?: GroupReviewGateCategoriesDTO
  textHTML?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface GroupReviewStatusDTO {
  submissionIdentifier: string;
  reviewPhase: string;
  userStatus: string;
}

export interface detailedQuestionCollectionDTO {
  id?: number;
  questionId: number;
  links: detailedQuestionCollectionLinkDTO[];
  textHTML?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface detailedQuestionCollectionLinkDTO {
  id?: number;
  questionCollectionId?: number;
  linkedContentElementId: number;
  createdAt?: Date;
  updatedAt?: Date;
}