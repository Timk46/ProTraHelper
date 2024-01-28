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
    isApproved: boolean;
    originId: number | null;
    codingQuestion?: CodingQuestionDto
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
    questionVersion?: QuestionVersionDTO ;
    isSC: boolean;
    shuffleOptions: boolean;
}

export interface MCOptionDTO {
    id: number;
    text: string;
    files?: FileDto[];
    isCorrect: boolean;
    selected?: boolean;
}

export interface McQuestionOptionDTO {
    id: number;
    mcQuestion?: McQuestionDTO;
    mcOption: MCOptionDTO;
}

export interface OptionDTO {
    id : number;
    text: string;
    selected: boolean;
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

export interface UserAnswerDataDTO {
    id: number;
    userId: number;
    questionId: number;
    userFreetextAnswer?: string;
    userMCAnswer?: number[];
    //space for more types of answers
}

export interface UserMCOptionSelectedDTO {
    id: number,
    userAnswerId: number,
    mcOptionId: number
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
    testCases: TestcaseDto[];
  }
  
  export interface TestcaseDto {
    id: number;
    input: string;
    expectedOutput: string;
    automatedTestId: number;
  }
  