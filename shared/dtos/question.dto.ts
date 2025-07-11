import { FileDto } from "./file.dto";
import { GraphConfigurationDTO, GraphStructureDTO } from "./graphTask.dto";
import { editorDataDTO, taskSettingsDTO } from "./umlearnDtos/dtos";

export interface QuestionDTO {
    id: number;
    name?: string;
    description?: string;
    score?: number;
    type: string;
    author?: number;
    text: string;
    conceptNodeId: number;
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
    id?: number;
    questionId?: number;
    version?: number;
    isApproved?: boolean;
    successor?: number | null;
}

//MC-Question
export interface McQuestionDTO {
    id: number;
    questionId: number;
    textHTML?: string;
    isSC: boolean;
    shuffleOptions: boolean;
    questionVersion?: QuestionVersionDTO;
    mcQuestionOption?: McQuestionOptionDTO[];
    additionalInfo?: string[];
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
    option: MCOptionDTO;
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
    count_InputArgs: number;
    programmingLanguage: string;
    mainFileName: string;
    text: string;
    textHTML: string;
    expectations?: string;
    codeGerueste: CodeGeruestDto[];
  }
  
  export interface CodingQuestionInternal extends CodingQuestionDto { // for backend only
    automatedTests: AutomatedTestDto[];
    modelSolutions?: ModelSolutionDto[];
  }

  export interface ModelSolutionDto {
    id: number;
    codingQuestionId: number;
    codeFileName: string;
    code: string;
    language: string;
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
  testClassName?:  string;
  runMethod?:      string;
  inputArguments?: string;
}

  export enum questionType {
    SINGLECHOICE = "SC",
    MULTIPLECHOICE = "MC",
    MCSLIDER = "MCSlider",
    FREETEXT = "FreeText",
    CODE = "CodingQuestion",
    FILLIN = "Fillin",
    GRAPH = "GraphQuestion",
    UML = "UMLQuestion",
    CODEGAME = "CodeGameQuestion",
    UPLOAD = "UploadQuestion",
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

export interface uploadQuestionDTO {
  questionId: number;
  contentElementId?: number;
  title: string;
  text: string;
  textHTML?: string;
  maxSize: number;
  fileType: string;
  maxPoints: number;
}

  export interface GraphQuestionDTO {
    questionId: number;
    contentElementId?: number;
    title: string;
    textHTML?: string;
    expectations: string;
    expectationsHTML?: string;
    type: string;
    initialStructure: GraphStructureDTO;
    exampleSolution: GraphStructureDTO[];
    stepsEnabled: boolean;
    configuration: GraphConfigurationDTO;
    maxPoints: number;
  }

  export interface TaskViewData {
    contentNodeId: number;
    contentElementId: number;
    id: number;
    name?: string;
    type: string;
    progress?: number;
    description?: string;
    level?: number;

}
  export interface UmlQuestionDTO {
    questionId: number;
    contentElementId?: number;
    title: string;
    text: string;
    textHTML?: string;
    editorData?: editorDataDTO;
    startData?: editorDataDTO;
    dataImage?: string;
    taskSettings?: taskSettingsDTO;
    maxPoints: number;
  }


export interface OptionDTO {
  answer: string;
  correct: boolean;
}

export interface McqEvaluation {
  question: string;
  evaluations?: {reasoning?: string, correct?: boolean}[];
  commentOnQuality?: string;
}

// CodeGame CodingQuestion DTOs

export interface CodeGameQuestionDto {
    id: number;
    contentElementId?: number;
    text: string;
    codeSolutionRestriction: boolean;
    fileNameToRestrict?: string;
    methodNameToRestrict?: string;
    frequencyOfMethodNameToRestrict?: number;
    programmingLanguage: string;
    codeGameScaffolds: CodeGameScaffoldDto[];
    gameFileName: string;
    game: string;
    gameCellRestrictions: string;
    theme: string;
}

export interface CodeGameScaffoldDto {
    id: number;
    codeGameQuestionId: number;
    codeFileName: string;
    code: string;
    language?: string;
    visible?: boolean;
    mainFile?: boolean;
}
