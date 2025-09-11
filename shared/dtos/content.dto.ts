import { contentElementType } from "./contentElementType.enum";
import { QuestionDTO } from "./question.dto";
import { FileDto } from "./file.dto";
import { userAnswerFeedbackDTO } from "./userAnswer.dto";
import { detailedQuestionDTO } from "./detailedQuestion.dto";

export interface ContentDTO {
  contentNodeId: number;
  name: string;
  description: string;
  descriptionHTML?: string;
  taskSectorTitle?: string;
  position?: number;
  contentElements: ContentElementDTO[];
  level: number;

  contentPrerequisiteIds?: number[];
  contentSuccessorIds?: number[];

  requiresConceptIds: number[];
  trainsConceptIds: number[];

  progress: number;
  levelProgress?: number;
  questionMarked?: boolean;
  isVisible?: boolean;

  //for lecturers view
  isApproved?: boolean;

  //discussion: Discussion // TODO: implement
}

export interface ContentUpdateDTO {
  name: string;
  description?: string;
  descriptionHTML?: string;
  taskSectorTitle?: string;
  difficulty?: number;
}

export interface ContentViewDTO {
  contentNode: ContentDTO;
  contentElement: ContentElementDTO;
  position: number;
  isVisible?: boolean;
}

export interface ContentViewInformationDTO {
  contentNodeId: number;
  contentElement: {
    id: number;
    type: contentElementType;
    title: string;
    question: {
      type: string;
    };
  };
  position: number;
  isVisible?: boolean;
}

export interface ContentElementDTO {
  id: number;
  type: contentElementType;
  contentViewId?: number;
  positionInSpecificContentView: number;
  title?: string;
  text?: string;
  file?: FileDto;
  question?: taskViewDTO;
  isVisible?: boolean;

  // MCSlider grouping properties (for client-side grouping only)
  mcSliderGroupKey?: string;
  mcSliderGroupSize?: number;
}

export interface ContentsForConceptDTO {
  trainedBy: ContentDTO[];
  requiredBy: ContentDTO[];
}

export interface taskViewDTO {
  id: number;
  contentElementId?: number;
  name?: string;
  description?: string;
  type: string;
  level: number;
  progress: number;
  score?: number;
  feedback?: userAnswerFeedbackDTO[];

  //for lecturers view
  isApproved?: boolean;
}
