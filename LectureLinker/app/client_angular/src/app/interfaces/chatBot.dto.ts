//import { UserDTO} from './user.dto';
export interface ChatBotMessageDTO {
    id: number;
    question: string;
    answer?: string;
    createdAt: Date;
    isBot: boolean;
    usedChunks?: string;
    //user?: UserDTO; // Optional, da es eine Relation zu User ist, die null sein kann
    //userId?: number; // Optional, da es mit `Int?` markiert ist
  }
