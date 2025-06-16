import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { UserService } from '../auth/user.service';
import { HighlightConceptDto, CreateHighlightConceptDto, UpdateHighlightConceptDto } from '@DTOs/index';



@Injectable({
  providedIn: 'root'
})
export class HighlightConceptsService {
  private readonly apiUrl = `${environment.server}/highlight-concepts`;

  constructor(
    private http: HttpClient,
    private userService: UserService
  ) { }

  /**
   * Gets all highlight concepts for a specific module
   * @param moduleId The ID of the module
   * @returns An Observable of HighlightConcept array
   */
  getHighlightConcepts(moduleId: number): Observable<HighlightConceptDto[]> {
    return this.http.get<HighlightConceptDto[]>(`${this.apiUrl}/module/${moduleId}`);
  }

  /**
   * Gets a specific highlight concept by ID
   * @param id The ID of the highlight concept
   * @returns An Observable of HighlightConcept
   */
  getHighlightConcept(id: number): Observable<HighlightConceptDto> {
    return this.http.get<HighlightConceptDto>(`${this.apiUrl}/${id}`);
  }

  /**
   * Creates a new highlight concept
   * Only available for ADMIN users
   * @param data The data for the new highlight concept
   * @returns An Observable of the created HighlightConcept
   */
  createHighlightConcept(data: CreateHighlightConceptDto): Observable<HighlightConceptDto> {
    return this.http.post<HighlightConceptDto>(this.apiUrl, data);
  }

  /**
   * Updates an existing highlight concept
   * Only available for ADMIN users
   * @param id The ID of the highlight concept to update
   * @param data The data to update
   * @returns An Observable of the updated HighlightConcept
   */
  updateHighlightConcept(id: number, data: UpdateHighlightConceptDto): Observable<HighlightConceptDto> {
    return this.http.put<HighlightConceptDto>(`${this.apiUrl}/${id}`, data);
  }

  /**
   * Deletes a highlight concept
   * Only available for ADMIN users
   * @param id The ID of the highlight concept to delete
   * @returns An Observable of the deletion result
   */
  deleteHighlightConcept(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }

  /**
   * Checks if the user has admin rights to modify highlight concepts
   * @returns A boolean indicating if the user is an admin
   */
  canModifyHighlightConcepts(): boolean {
    try {
      const role = this.userService.getRole();
      return role === 'ADMIN';
    } catch (error) {
      return false;
    }
  }
}
