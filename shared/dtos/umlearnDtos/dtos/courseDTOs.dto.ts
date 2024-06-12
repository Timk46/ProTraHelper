import { EditorModel, editorDataDTO} from "./editorDTOs.dto";
import { taskDataDTO } from "./taskDTOs.dto";
import { userDTO } from "./authDTOs.dto";

export interface courseOverviewDataDTO {
    courses : courseDTO[];
    tasks : taskDTO[];
}

export interface coursePageLecturerDataDTO {
    studentCount: number;
    course : courseDTO;
    tasks : taskFeedbackForCourseDTO[];
}
export interface coursePageStudentDataDTO {
    course: courseDTO;
    tasks: taskFeedbackForCourseDTO[];
}

export interface courseDTO {
    courseId: number;
    courseTitle: string;
    courseSubTitle?: string;
    courseLecturer: string;
    courseDescription: string;
}

export interface taskDTO {
    taskId: number;
    courseTitle: string;
    taskTitle: string;
    deadline: Date;
    isFeedbackComplete: boolean;
}

export interface courseCreationDTO {
    id: number;
    courseTitle: string;
    courseDescription: string;
}

export interface taskAttemptDTO {
    student: userDTO,
    taskAttemptId?: number;
    feedbackId?: number;
}

export interface taskAttemptDataDTO {
    taskId: number;
    attemptData: editorDataDTO;
}

export interface taskInformationDTO {
    taskId: number;
    deadline: Date;
    taskDescription: string;
    taskTitle: string;
}

export interface tasksForCourseDTO {
    courseId: number;
    tasksInformations: taskInformationDTO[];
}

export interface taskOverviewDTO {
    maxPoints: number;
    taskId: number;
    taskDescription: string;
    taskTitle: string;
}
export interface tasksOverviewDTO {
    tasksInformations: taskOverviewDTO[];
}

export interface tasksInformationDTO {
    tasksInformations: taskInformationDTO[];
}

export interface taskFeedbackDTO {
    feedbackId: number;
    lecturerId: number;
    taskAttemptId: number;
    reachedPoints: number;
    feedbackText: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface taskFeedbackDataDTO {
    attempt: taskAttemptDataDTO;
    task: taskDataDTO;
    feedback: taskFeedbackDTO;
}

export interface taskCreationPopupDTO {
    id: number;
    lecturerId: number;
    taskDescription: string;
    taskTitle: string;
    selectedModel: EditorModel;
}

export interface taskFeedbacksDTO {
    courseId: number,
    taskId: number,
    feedbackData: taskFeedbackDTO[]
}
export interface studentTaskStatusDTO {
    student: userDTO,
    hasAttempt: boolean,
    hasFeedback: boolean,
}
export interface taskFeedbackForCourseDTO {
    taskId:number, 
    taskTitle:string, 
    taskDescription:string,
    deadline: Date, 
    feedbackCount: number,
}

