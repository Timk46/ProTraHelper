export interface NotificationDTO {
    userId: number;
    message: string;
    timestamp?: Date;
    isRead?: boolean;
    readTimestamp?: Date;
    type?: string
}