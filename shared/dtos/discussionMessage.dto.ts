export interface discussionMessageDTO {
    messageId: number;
    discussionId: number;
    authorId: number;
    authorName: string;
    createdAt: Date;
    messageText: string;
    isSolution: boolean;
    isInitiator: boolean;
}

export interface discussionMessagesDTO {
    messages: discussionMessageDTO[];
}

