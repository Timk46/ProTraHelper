export interface discussionCreationDTO {
    title: string;
    text: string;
    conceptNodeId: number;
    contentNodeId: number;
    contentElementId: number;
}

export interface discussionMessageCreationDTO {
    text: string;
    discussionId: number;
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