import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BlankDTO, FillinQuestionDTO } from '@DTOs/index';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class FillInTaskService {
  private readonly apiUrl = environment.server; // Replace with your actual API URL

  constructor(private readonly http: HttpClient) {}

  /**
   * Get all fill-in tasks
   * @returns {Observable<FillinQuestionDTO[]>} All fill-in tasks
   */
  getAllTasks(): Observable<FillinQuestionDTO[]> {
    return this.http.get<FillinQuestionDTO[]>(this.apiUrl + `/fill-in-tasks`);
  }

  /**
   * Create a new fill-in task
   * @param {CreateFillinQuestionDTO} createTaskDto The task data
   * @returns {Observable<FillinQuestionDTO>} The created task
   */
  createFillInTask(createTaskDto: FillinQuestionDTO): Observable<FillinQuestionDTO> {
    createTaskDto.blanks = createTaskDto.blanks.map(blank => ({
      ...blank,
      isDistractor: blank.isDistractor || false,
    }));
    console.log('sending data from frontend service: ', createTaskDto);
    return this.http.post<FillinQuestionDTO>(`${this.apiUrl}/fill-in-tasks/task`, createTaskDto);
  }

  /**
   * Update a blank in a fill-in task
   * @param {{ taskId: number, position: string, word: string }} updateBlankDto The updated blank data
   * @returns {Observable<any>} The updated blank
   */
  updateBlank(updateBlankDto: BlankDTO): Observable<BlankDTO> {
    return this.http.put<BlankDTO>(
      `${this.apiUrl}/fill-in-tasks/blank/${updateBlankDto.id}`,
      updateBlankDto,
    );
  }

  /**
   * Update a fill-in task
   * @param {FillinQuestionDTO} updateTaskDto The updated task data
   * @returns {Observable<FillinQuestionDTO>} The updated task
   */
  updateFillInTask(updateTaskDto: FillinQuestionDTO): Observable<FillinQuestionDTO> {
    return this.http.put<FillinQuestionDTO>(
      `${this.apiUrl}/fill-in-tasks/${updateTaskDto.id}`,
      updateTaskDto,
    );
  }

  /**
   * Get a fill-in task by ID
   * @param {number} id The ID of the task to get
   * @returns {Observable<FillinQuestionDTO>} The task
   */
  getTask(id: number): Observable<FillinQuestionDTO> {
    return this.http.get<FillinQuestionDTO>(`${this.apiUrl}/fill-in-tasks/task/${id}`);
  }

  /**
   * Delete a fill-in task
   * @param {number} id The ID of the task to delete
   * @returns {Observable<FillinQuestionDTO>} The deleted task
   */
  deleteTask(id: number): Observable<FillinQuestionDTO> {
    return this.http.delete<FillinQuestionDTO>(`${this.apiUrl}/${id}`);
  }
}
