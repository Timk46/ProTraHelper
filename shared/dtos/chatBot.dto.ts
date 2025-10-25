import { UserDTO} from './user.dto';

/**
 * ChatBot message data transfer object
 *
 * @interface ChatBotMessageDTO
 */
export interface ChatBotMessageDTO {
    id: number;
    question: string;
    answer?: string;
    createdAt: Date;
    isBot: boolean;
    usedChunks?: string;
    user?: UserDTO;
    userId?: number;
    ratingByStudent?: number;
    sessionId?: number;
  }

/**
 * ChatBot session data transfer object
 *
 * @interface ChatSessionDTO
 */
export interface ChatSessionDTO {
  id: number;
  title: string;
  createdAt: string;
  messages: ChatBotMessageDTO[];
}
