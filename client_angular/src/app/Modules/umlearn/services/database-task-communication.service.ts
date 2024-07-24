import {
  taskCreationPopupDTO, taskInformationDTO, tasksInformationDTO, taskAttemptDTO,
  taskAttemptDataDTO, taskFeedbackDTO, taskFeedbackDataDTO, studentTaskStatusDTO,
  tasksOverviewDTO, jaroWinklerDTO, taskDataDTO, taskWorkspaceDataDTO,
  editorDataDTO
} from '@DTOs/index';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';


@Injectable({
  providedIn: 'root'
})

export class DatabaseTaskCommunicationService {

  constructor(private http: HttpClient) { }

  /**
   * Finds a synonym for an attempt based on a solution.
   * @param solution - The solution string.
   * @param attempt - The attempt string.
   * @returns An Observable that emits the new attempt string.
   */
  synonym(solution:string, attempt:string): Observable<{newAttempt: string}> {
    return this.http.get<{newAttempt: string}>(environment.server + `/database-task-communication/synonym/${solution}/${attempt}`);
  }

  /**
   * Retrieves the overview data for all tasks.
   * @returns An Observable that emits the tasks overview data as a tasksOverviewDTO object.
   */
  getTasksOverview(): Observable<tasksOverviewDTO> {
    return this.http.get<tasksOverviewDTO>(environment.server + '/database-task-communication/taskOverviewData');
  }

  /**
   * Retrieves the information for all tasks.
   * @returns An Observable that emits the tasks information as a tasksInformationDTO object.
   */
  getTasks(): Observable<tasksInformationDTO> {
    return this.http.get<tasksInformationDTO>(environment.server + '/database-task-communication/taskOverview');
  }

  /**
   * Creates a new task.
   * @param taskCreationData - The data for creating the task.
   * @returns An Observable that emits the created task data as a taskCreationPopupDTO object.
   */
  createTask(taskCreationData: taskCreationPopupDTO): Observable<taskCreationPopupDTO> {
    return this.http.post<taskCreationPopupDTO>(environment.server + '/database-task-communication/taskCreation', taskCreationData);
  }

  /**
   * Sets the data for a task.
   * @param taskData - The data to be set for the task.
   * @returns An Observable that emits the updated task data as a taskDataDTO object.
   */
  setTaskData(taskData: taskDataDTO){
    return this.http.post<taskDataDTO>(environment.server + '/database-task-communication/setTaskData', taskData);
  }

  /**
   * Sets the image for a task.
   * @param data - The data containing the task ID and the image in base64 format.
   * @returns An Observable that emits the task ID.
   */
  setTaskImage(data: {taskId: number, imageB64: string}): Observable<number> {
    return this.http.post<number>(environment.server + '/database-task-communication/setTaskImage', data);
  }

  /**
   * Retrieves the image for a task.
   * @param taskId - The ID of the task.
   * @returns An Observable that emits the image in base64 format.
   */
  getTaskImage(taskId: number): Observable<{imageB64: string}> {
    return this.http.get<{imageB64: string}>(environment.server + `/database-task-communication/getTaskImage/${taskId}`);
  }

  /**
   * Deletes a task.
   * @param taskId - The ID of the task to be deleted.
   * @returns An Observable that emits the deleted task information as a taskInformationDTO object.
   */
  deleteTask(taskId: number): Observable<taskInformationDTO> {
    return this.http.delete<taskInformationDTO>(environment.server + '/database-task-communication/taskDeletion/' + taskId);
  }

  /**
   * Retrieves the task settings data for a given task ID.
   * @param taskId - The ID of the task to retrieve settings data for.
   * @returns An Observable that emits the task settings data as a taskSettingsDTO object.
   */
  getTaskData(taskId: number): Observable<taskDataDTO> {
    return this.http.get<taskDataDTO>(environment.server + `/database-task-communication/taskWorkspace/${taskId}`);
  }

  /**
   * Retrieves the task workspace data for a given task ID.
   * @param taskId - The ID of the task to retrieve workspace data for.
   * @returns An Observable that emits the task workspace data as a taskWorkspaceDataDTO object.
   */
  getTaskWorkspaceData(taskId: number): Observable<taskWorkspaceDataDTO> {
    return this.http.get<taskDataDTO>(environment.server + `/database-task-communication/taskWorkspaceData/${taskId}`);
  }

  /**
   * Retrieves the feedback data for a certain task attempt.
   * @param taskAttemptId - The ID of the task attempt.
   * @returns An Observable that emits the task feedback data as a taskFeedbackDataDTO object.
   */
  getTaskFeedbackData(taskAttemptId: number): Observable<taskFeedbackDataDTO> {
    return this.http.get<taskFeedbackDataDTO>(environment.server + `/database-task-communication/taskFeedback/${taskAttemptId}`);
  }

  commitAttemptGetPoints(taskAttemptData: taskAttemptDataDTO): Observable<{points: number, highlightData: editorDataDTO}> {
    return this.http.post<{points: number, highlightData: editorDataDTO}>(environment.server + '/database-task-communication/commitAttempt', taskAttemptData);
  }

  generateUmlFeedback(taskId: number): Observable<{response: string}> {
    console.log("generateUmlFeedback", taskId);
    return this.http.get<{response: string}>(environment.server + '/database-task-communication/generateUmlFeedback/' + taskId);
  }

  generateUmlFeedbackByHighlighted(taskId: number): Observable<{response: string}> {
    return this.http.get<{response: string}>(environment.server + '/database-task-communication/generateUmlFeedbackByHighlighted/' + taskId);
  }

  /**
   * Sets the task attempt data by making a POST request to the server.
   * @param taskAttemptData - The task attempt data to be set.
   * @returns An Observable that emits the updated task attempt data.
   */
  setTaskAttemptData(taskAttemptData: taskAttemptDataDTO): Observable<taskAttemptDataDTO> {
    return this.http.post<taskAttemptDataDTO>(environment.server + '/database-task-communication/taskAttempt', taskAttemptData);
  }

  /**
   * Retrieves the task attempt data for a specific task attempt and student.
   * @param taskId - The ID of the task.
   * @param courseId - The ID of the course.
   * @returns An Observable that emits the task attempt data as a taskAttemptDataDTO object.
   */
  getTaskAttemptData(taskId: number): Observable<taskAttemptDataDTO> {
    return this.http.get<taskAttemptDataDTO>(environment.server + `/database-task-communication/taskAttempt/${taskId}`);
  }

  /**
   * Retrieves the task attempt data for a specific task attempt, student, and course.
   * @param courseId - The ID of the course.
   * @param taskId - The ID of the task.
   * @param studentId - The ID of the student.
   * @returns An Observable that emits the task attempt data as a taskAttemptDataDTO object.
   */
  getTaskAttemptDataByStudent(courseId: number, taskId: number, studentId: number): Observable<taskAttemptDataDTO> {
    return this.http.get<taskAttemptDataDTO>(environment.server + `/database-task-communication/taskAttempt/${courseId}/${taskId}/${studentId}`);
  }

  /**
   * Creates feedback for a certain task attempt.
   * @param taskFeedbackData - The feedback data to be created.
   * @returns An Observable that emits the created feedback data as a taskFeedbackDTO object.
   */
  createFeedback(taskFeedbackData: taskFeedbackDTO): Observable<taskFeedbackDTO> {
    return this.http.post<taskFeedbackDTO>(environment.server + '/database-task-communication/taskFeedback', taskFeedbackData);
  }

  /**
   * Retrieves the feedback data for a specific task attempt, student, and course.
   * @param courseId - The ID of the course.
   * @param taskId - The ID of the task.
   * @param studentId - The ID of the student.
   * @returns An Observable that emits the task feedback data as a taskFeedbackDataDTO object.
   */
  getTaskFeedbackDataByStudent(courseId: number, taskId: number, studentId: number): Observable<taskFeedbackDataDTO> {
    return this.http.get<taskFeedbackDataDTO>(environment.server + `/database-task-communication/taskFeedback/${courseId}/${taskId}/${studentId}`);
  }

  /**
   * Retrieves the open attempts for a specific course and task.
   * @param courseId - The ID of the course.
   * @param taskId - The ID of the task.
   * @returns An Observable that emits an array of taskAttemptDTO objects.
   */
  showOpenAttempts(courseId: number, taskId: number): Observable<taskAttemptDTO[]> {
    return this.http.get<taskAttemptDTO[]>(environment.server + `/database-task-communication/coursePageLecturer/${courseId}/${taskId}`);
  }

  /**
   * Retrieves the feedback data for a specific course.
   * @param courseId - The ID of the course.
   * @returns An Observable that emits an array of taskFeedbackDataDTO objects.
   */
  getTaskFeedbackDataByCourse(courseId: number): Observable<taskFeedbackDataDTO[]> {
    return this.http.get<taskFeedbackDataDTO[]>(environment.server + `/database-task-communication/coursePageLecturer/${courseId}`);
  }

  /**
   * Checks if a task attempt exists for a specific course, task, and student.
   * @param courseId - The ID of the course.
   * @param taskId - The ID of the task.
   * @param studentId - The ID of the student.
   * @returns An Observable that emits a boolean value indicating whether the task attempt exists or not.
   */
  hasTaskAttempt(courseId: number, taskId: number, studentId: number): Observable<boolean> {
    return this.http.get<boolean>(environment.server + `/database-task-communication/taskAttempt/${courseId}/${taskId}/${studentId}`);
  }

  /**
   * Checks if feedback exists for a specific course, task, and student.
   * @param courseId - The ID of the course.
   * @param taskId - The ID of the task.
   * @param studentId - The ID of the student.
   * @returns An Observable that emits a boolean value indicating whether the feedback exists or not.
   */
  hasFeedback(courseId: number, taskId: number, studentId: number): Observable<boolean> {
    return this.http.get<boolean>(environment.server + `/database-task-communication/taskFeedback/${courseId}/${taskId}/${studentId}`);
  }

  /**
   * Retrieves the task status for a specific student and task.
   * @param courseId - The ID of the course.
   * @param taskId - The ID of the task.
   * @returns An Observable that emits an array of studentTaskStatusDTO objects.
   */
  getStudentTaskStatus(courseId: number, taskId: number): Observable<studentTaskStatusDTO[]> {
    return this.http.get<studentTaskStatusDTO[]>(environment.server + `/database-task-communication/coursePageLecturer/studentTaskStatus/${courseId}/${taskId}`);
  }

  /**
   * Retrieves the task status for a specific student and course.
   * @param courseId - The ID of the course.
   * @param studentId - The ID of the student.
   * @returns An Observable that emits an array of studentTaskStatusDTO objects.
   */
  checkForTaskAttempts(taskId: number): Observable<boolean> {
    return this.http.get<boolean>(environment.server + `/database-task-communication/checkForTaskAttempts/${taskId}`);
  }

  /**
   * Checks if there are any task attempts for a given course and task.
   * @param courseId - The ID of the course.
   * @param taskId - The ID of the task.
   * @returns An Observable that emits a boolean value indicating whether there are any task attempts.
   */
  checkForTaskAttemptsForCourse(courseId: number, taskId: number): Observable<boolean> {
    return this.http.get<boolean>(environment.server + `/database-task-communication/checkForTaskAttemptsForTask/${courseId}/${taskId}`);
  }

  /**
   * Checks if there are any task attempts for a specific course and student.
   * @param courseId - The ID of the course.
   * @param studentId - The ID of the student.
   * @returns An Observable that emits a boolean indicating whether there are any task attempts.
   */
  checkForTaskAttemptsForCourseAndStudent(courseId: number, studentId: number): Observable<boolean> {
    return this.http.get<boolean>(environment.server + `/database-task-communication/checkForTaskAttemptsForCourseAndStudent/${courseId}/${studentId}`);
  }

}
