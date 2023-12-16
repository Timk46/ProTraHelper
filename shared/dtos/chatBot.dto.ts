import { UserDTO} from './user.dto';
export interface ChatBotMessageDTO {
    id: number;
    question: string;
    answer?: string;
    createdAt: Date;
    isBot: boolean;
    usedChunks?: string;
    user?: UserDTO;
    userId?: number; 
  }