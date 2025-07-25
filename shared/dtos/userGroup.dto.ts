import { UserDTO } from "./user.dto";

export interface UserGroupDTO {
    id: number;
    name: string;
    maxSize: number;
    createdAt: Date;
    updatedAt: Date;
    UserGroupMembership?: UserGroupMembershipDTO[];
}

export interface CreateUserGroupDTO {
    name: string;
    maxSize: number;
}

export interface UserGroupMembershipDTO {
    id: number;
    userId: number;
    groupId: number;
    joinedAt: Date;
    user?: UserDTO;
    group?: UserGroupDTO;
}

export interface CreateUserGroupMembershipDTO {
    userId: number;
    groupId: number;
}
