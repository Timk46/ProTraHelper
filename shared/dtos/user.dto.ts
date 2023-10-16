import { globalRole } from "./roles.enum";

export interface UserDTO {
    id: number;
    email: string;
    firstname: string;
    lastname: string;
    globalRole: globalRole;
}

export interface AnonymousUserDTO {
    id: number;
    userId: number;
    anonymousName: string;
}