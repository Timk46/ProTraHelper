export interface discussionCreationDTO {
    id: number;
    title: string;
    conceptNodeId: number;
    contentNodeId: number;
    contentElementId: number;
    authorId: number;
    isSolved: boolean;
}

export interface discussionMessageCreationDTO {
    id: number;
    text: string;
    authorId: number;
    discussionId: number;
    isInitiator: boolean;
    isSolution: boolean;
}

export interface discussionNodeNamesDTO {
    conceptNodeName: string;
    contentNodeName: string;
    contentElementName: string;
}

export interface creationResponseDTO {
    ok: Boolean,
    returnNumber: number,
    returnText: string
}