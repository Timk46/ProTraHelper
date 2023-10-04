export interface discussionDTO {
    id: number;
    initMessageId: number;
    title: string;
    authorName: string;
    createdAt: Date;
    contentNodeName: string;
    commentCount: number;
    isSolved: boolean;
}

export interface discussionsDTO {
    discussions: discussionDTO[];
}

export interface nodeNameDTO {
    name: string;
}