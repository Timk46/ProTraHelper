export interface NotificationDTO {
    id?: number;
    userId: number;
    message: string;
    timestamp?: Date;
    isRead?: boolean;
    delivered?: boolean;
    readTimestamp?: Date;
    type?: string
    discussionId?: number;
    conceptNodeId?: number;
    videoId?: string;
}