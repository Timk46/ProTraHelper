import { EditorModel, editorDataDTO, editorElementDTO } from "./editorDTOs.dto";

export interface taskDataDTO {
    id: number;
    title: string;
    description: string;
    lecturerId: number;
    editorData: editorDataDTO;
    taskSettings: taskSettingsDTO;
    maxPoints: number;
    createdAt: Date;
    updatedAt: Date;
    image?: Blob;
}

export interface taskWorkspaceDataDTO {
    id: number;
    title: string;
    description: string;
    taskSettings: taskSettingsDTO;
    maxPoints: number;
}

export interface taskSettingsDTO {
    allowedNodeTypes: editorElementDTO[];
    allowedEdgeTypes: editorElementDTO[];
    editorModel: EditorModel;
}

export interface jaroWinklerDTO {
    attempt: string;
}