import { QuestionDTO } from "./question.dto";

export interface LinkableContentNodeDTO {
  id?: number;
  name: string;
  description?: string;
  conceptNodeId: number;
  awardsLevel: number;
}

export interface LinkableContentElementDTO {
  id?: number;
  contentNodeId: number; // -> the 'folder'
  question?: QuestionDTO;
  questionId?: number; // if question is already created
  contentElementTitle?: string; // question title per default
  contentElementText?: string; // nothing per default
  position?: number; // position in the content node
}