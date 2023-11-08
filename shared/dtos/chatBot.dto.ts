import { UserDTO} from './user.dto';
export interface ChatBotMessageDTO {
    id: number;
    question: string;
    answer?: string; // Optional, da es mit `String?` markiert ist
    createdAt: Date;
    isBot: boolean;
    usedChunks?: string; // Optional, da es mit `String?` markiert ist
    user?: UserDTO; // Optional, da es eine Relation zu User ist, die null sein kann
    userId?: number; // Optional, da es mit `Int?` markiert ist
  }