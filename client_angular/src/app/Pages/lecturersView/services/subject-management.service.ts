import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "src/environments/environment";
import { 
  UserGroupDTO, 
  CreateUserGroupDTO, 
  UserGroupMembershipDTO, 
  CreateUserGroupMembershipDTO, 
  UserDTO
} from "@DTOs/index";

@Injectable()
export class SubjectManagementService {
  private readonly baseUrl = `${environment.server}/user-group`;

  constructor(private http: HttpClient) { }

  // UserGroup methods
  createUserGroup(userGroup: CreateUserGroupDTO): Observable<UserGroupDTO> {
    return this.http.post<UserGroupDTO>(this.baseUrl, userGroup);
  }

  getUserGroups(): Observable<UserGroupDTO[]> {
    return this.http.get<UserGroupDTO[]>(this.baseUrl);
  }

  getUserGroupById(id: number): Observable<UserGroupDTO> {
    return this.http.get<UserGroupDTO>(`${this.baseUrl}/${id}`);
  }

  deleteUserGroup(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  getAllUsers(): Observable<UserDTO[]> {
    return this.http.get<UserDTO[]>(`${this.baseUrl}/users`);
  }

  // UserGroupMembership methods
  createUserGroupMembership(membership: CreateUserGroupMembershipDTO): Observable<UserGroupMembershipDTO> {
    return this.http.post<UserGroupMembershipDTO>(`${this.baseUrl}/membership`, membership);
  }

  getUserGroupMemberships(groupId: number): Observable<UserGroupMembershipDTO[]> {
    return this.http.get<UserGroupMembershipDTO[]>(`${this.baseUrl}/${groupId}/memberships`);
  }

  deleteUserGroupMembershipById(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/membership/${id}`);
  }

  deleteUserGroupMembership(userId: number, groupId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/membership/user/${userId}/group/${groupId}`);
  }
}
