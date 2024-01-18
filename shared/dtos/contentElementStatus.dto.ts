export interface ContentElementStatusDTO {
    contentElementId: number;
    userStatusCompleted: boolean;
    userStatusQuestion: boolean;
}

export interface ContentElementStatusCreationDTO {
    contentElementId: number;
    userId: number;
    statusCompleted: boolean;
    statusQuestion: boolean;
}