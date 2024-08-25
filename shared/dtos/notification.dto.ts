import { NotificationType } from "./notificationType.enum";

export interface NotificationDTO {
    id?: number;
    userId?: number;
    message: string;
    timestamp?: Date;
    isRead?: boolean;
    readTimestamp?: Date;
    type?: NotificationType;
    title?: string;
    discussionId?: number;
    conceptNodeId?: number;
    videoId?: string;
    formattedTimestamp?: string;
    formattedTimestampTitle?: string;
}