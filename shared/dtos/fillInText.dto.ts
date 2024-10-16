import { QuestionDTO } from "./question.dto";

// FillinQuestionDTO - for retrieving task data
export interface FillinQuestionDTO {
  id?: number;
  content: string;
  taskType?: string;
  table?: boolean;
  question: QuestionDTO;
  createdAt?: Date;
  updatedAt?: Date;
  blanks: BlankDTO[];
} 


// BlankDTO - for retrieving blank data
export interface BlankDTO {
  id?: number;
  blankContent: string | null;
  position?: string;
  isDistractor?: boolean;
  isCorrect?: boolean;
  fillinQuestionId?: number;
  isImage?: boolean;
  imageUrl?: string;
}


