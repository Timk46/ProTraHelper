export interface UserDto {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  globalRole: globalRole;
}

export enum globalRole {
  ADMIN = "Admin",
  TEACHER = "Teacher",
  STUDENT = "Student",
}
