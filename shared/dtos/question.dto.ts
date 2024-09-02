import { FileDto } from "./file.dto";

export interface QuestionDTO {
    id: number;
    name?: string;
    description?: string;
    score?: number;
    type: string;
    author?: number;
    text: string;
    conceptNode?: number;
    conceptNodeName?: string;
    isApproved: boolean;
    originId?: number;
    codingQuestion?: CodingQuestionDto,
    level: number;
    mode?: string;
    version?: number;
}

/*export interface QuestionDto { // This is the Tutor-Kai Question DTO. ToDo: NEEDS MERGE
    id: number;
    name: string;
    week: number;
    description: string;
    score: number;
    type: string;
    text: string;
    codingQuestion: CodingQuestionDto;
  }
*/
  
export interface QuestionVersionDTO {
    id: number;
    questionId: number;
    version: number;
    isApproved: boolean;
    successor: number | null;
}

//MC-Question
export interface McQuestionDTO {
    id: number;
    questionId: number;
    isSC: boolean;
    shuffleOptions: boolean;
}

/**
 * This DTO is for showing the mc options in the mc task component
 */
export interface MCOptionDTO {
    id: number;
    text: string;
    files?: FileDto[];
    //isCorrect needs to be deleted from the MCOptionDTO that is given to the mc task component, because is shows the correct anwers!
    correct: boolean;
    //selected is only used in the mc task component and so it should also be transfered to the MCOptionCheckDTO
    selected?: boolean;
}

/**
 * This DTO is for checking the mc answers of the user
 */
export interface MCOptionViewDTO {
    id: number;
    text: string;
    files?: FileDto[];
    selected?: boolean;
}

export interface McQuestionOptionDTO {
    id: number;
    mcQuestion?: McQuestionDTO;
    mcOption: MCOptionDTO;
}

export interface UserMCAnswerDTO {
    id: number;
    userId: number;
    mcQuestionId: number;
}

export interface UserAnswerDTO {
    id: number;
    userId: number;
    questionId: number;
    feedbackId: number | null;
    userFreetextAnswer: string | null;
}

// TutorKai CodingQuestion DTOs

export interface CodingQuestionDto {
    id: number;
    countInputArgs: number;
    programmingLanguage: string;
    mainFileName: string;
    text: string;
    textHTML: string;
    codeGerueste: CodeGeruestDto[];
  }
  
  export interface CodingQuestionInternal extends CodingQuestionDto { // for backend only
    automatedTests: AutomatedTestDto[];
  }
  
  export interface CodeGeruestDto {
    id: number;
    codingQuestionId: number;
    codeFileName: string;
    code: string;
    language: string;
  }
  
  export interface AutomatedTestDto {
    id: number;
    code: string;
    testFileName: string;
    language: string;
    questionId: number;
  }

  export enum questionType {
    SINGLECHOICE = "SC",
    MULTIPLECHOICE = "MC",
    FREETEXT = "FreeText",
    CODE = "CodingQuestion",
  }

  export interface McqGenerationDTO {
    question?: string;
    answers?: {answer?: string; correct?: boolean}[];
    description?: string;
    score?: number;
  }

  export interface freeTextQuestionDTO {
    questionId: number;
    contentElementId?: number;
    title: string;
    text: string;
    textHTML?: string;
    expectations: string;
    expectationsHTML?: string;
    exampleSolution?: string;
    exampleSolutionHTML?: string;
    maxPoints: number;
  }