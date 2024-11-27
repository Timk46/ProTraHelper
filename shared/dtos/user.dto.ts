import { globalRole } from "./roles.enum";

export interface UserDTO {
    id: number;
    email: string;
    firstname: string;
    lastname: string;
    globalRole: globalRole;
    userSubjects?: UserSubjectDTO[];
    currentDeviceId?: string;
}

export interface UserSubjectDTO {
    id: number;
    name: string;
    userId: number;
    subjectId: number;
    subjectSpecificRole: string;
    registeredForSL: boolean;
}

/**
 * Called 'AnonymousUser' to provide a state of anonymity for users who are using the discussion feature.
 * Every real user gets an anonymous user id for each discussion they participate in.
 * This way, the user can have a different nickname for each discussion.
 * It is possible to determine which anonymousUser belongs to which discussion or message by checking
 * the 'authorId' field in both the discussion and message table.
 */
export interface AnonymousUserDTO {
    id: number;
    userId: number;
    anonymousName: string;
}
