export interface userDataDTO {
    id: number;
    email: string;
    passwordHash: string;
    firstname: string;
    lastname: string;
    globalRole: string;
}

export interface userDTO {
    id: number;
    firstname: string;
    lastname: string;
}

export interface loginDTO {
    email: string;
    password: string;
}

export interface tokenPayloadDataDTO {
    sub: number; //this is a jwt standard, we use it to store the user id
    globalRole: string;
    firstName?: string;
    lastName?: string;
    email?: string;
}

export interface tokenRequestDTO extends Request {
    tokenPayloadData: tokenPayloadDataDTO;
}

export interface userTokenDTO {
    acessToken: string;
}