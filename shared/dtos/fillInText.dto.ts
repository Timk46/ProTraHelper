import { QuestionDTO } from "./question.dto";

// FillInTaskDTO - for retrieving task data
export interface FillInTaskDTO {
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
  word: string | null;
  position?: string;
  isDistractor?: boolean;
  fillInTaskId?: number;
  isImage?: boolean;
  imageUrl?: string;
}


