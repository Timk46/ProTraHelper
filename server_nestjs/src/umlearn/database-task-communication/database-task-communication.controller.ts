import { Body, Controller, Get, Post, Request, Delete, Param, Req, UseGuards } from '@nestjs/common';
import { DatabaseTaskCommunicationService } from './database-task-communication.service';
import { taskCreationPopupDTO, taskInformationDTO, tokenRequestDTO, taskFeedbackDTO, taskDataDTO, taskAttemptDataDTO, taskFeedbackDataDTO, editorModelDTO, jaroWinklerDTO, studentTaskStatusDTO, tasksOverviewDTO, tasksInformationDTO, taskWorkspaceDataDTO, editorDataDTO } from '@DTOs/index';
import { ClassNode } from '@Interfaces/index';
import { RolesGuard, roles } from '@/auth/roles.guard';

@UseGuards(RolesGuard)
@Controller('database-task-communication')
export class DatabaseTaskCommunicationController {

  constructor(private readonly tasksService: DatabaseTaskCommunicationService) {}

  /**
   * Retrieves a new attempt by finding a synonym for the given solution and attempt.
   * @param solution - The solution string.
   * @param attempt - The attempt string.
   * @returns A promise that resolves to an object containing the new attempt string.
   */
  @roles('ANY')
  @Get('synonym/:solution/:attempt')
  async synonym(@Param('solution') solution: string, @Param('attempt') attempt: string) : Promise<{newAttempt:string}> {
    return this.tasksService.synonym(String(solution), String(attempt));
  }

  /**
   * Retrieves the overview of tasks for a specific user.
   * @param req - The request object containing the token payload data.
   * @returns A promise that resolves to a tasksOverviewDTO object.
   */
  /* @roles('TEACHER, ADMIN')
  @Get('taskOverviewData')
  async getTasksOverview(@Request() req: tokenRequestDTO): Promise<tasksOverviewDTO> {
  return this.tasksService.getTasksOverview(req.tokenPayloadData.sub);
  } */

  /**
   * Retrieves tasks information based on the provided token.
   * @param {tokenRequestDTO} req - The request object containing the token payload data.
   * @returns {Promise<tasksInformationDTO>} - A promise that resolves to the tasks information.
   */
  /* @roles('TEACHER, ADMIN')
  @Get('taskOverview')
  async getTasks(@Request() req: tokenRequestDTO): Promise<tasksInformationDTO> {
  return this.tasksService.getTasksOverviewData(req.tokenPayloadData.sub);
  } */

  /**
   * Sets the task creation data.
   * @param {taskCreationPopupDTO} taskCreationData - The task creation data.
   * @returns {Promise<taskCreationPopupDTO>} A promise that resolves to the task creation data.
   */
  /* @roles('TEACHER, ADMIN')
  @Post('taskCreation')
  setTaskCreationData(@Body() taskCreationData: taskCreationPopupDTO): Promise<taskCreationPopupDTO> {
    return this.tasksService.createTask(taskCreationData);
  } */

  /**
   * Sets the task data.
   * @param {taskDataDTO} taskData - The task data to be set.
   * @returns {Promise<taskDataDTO>} A promise that resolves to the updated task data.
   */
  /* @roles('TEACHER, ADMIN')
  @Post('setTaskData')
  setTaskData(@Body() taskData: taskDataDTO): Promise<taskDataDTO> {
    return this.tasksService.setTaskData(taskData);
  } */

  /**
   * Sets the image for a task.
   *
   * @param data - The data object containing the taskId and imageB64.
   * @returns A Promise that resolves to the number of affected rows in the database.
   */
  /* @roles('TEACHER, ADMIN')
  @Post('setTaskImage')
  setTaskImage(@Body() data: {taskId: number, imageB64: string}): Promise<number> {
    return this.tasksService.setTaskImage(data.taskId, data.imageB64);
  } */

  /**
   * Retrieves the image associated with a task.
   * @param taskId - The ID of the task.
   * @returns A promise that resolves to an object containing the base64-encoded image.
   * @throws Error if the taskId is invalid.
   */
  @roles('TEACHER, ADMIN')
  @Get('getTaskImage/:taskId')
  async getTaskImage(@Param('taskId') taskId: number): Promise<{imageB64: string}> {
    if (isNaN(taskId)) {
      throw new Error('Invalid taskId');
    }
    return this.tasksService.getTaskImage(Number(taskId));
  }

  /**
   * Retrieves the task attempt data for a specific attempt and student.
   *
   * @param attemptId - The ID of the task attempt.
   * @param studentId - The ID of the student.
   * @returns A Promise that resolves to the taskAttemptDataDTO object containing the task attempt data.
   */
  @roles('ANY')
  @Get('taskAttempt/:taskId')
  async getTaskAttemptData(@Param('taskId')taskId: number, @Req() req): Promise<taskAttemptDataDTO> {
    if (isNaN(taskId)) {
      throw new Error('Invalid taskId');
    }
    //console.log('LOG VOM SERVER-CONTROLLER ' + 'taskId= ' + taskId + 'CourseId= ' + courseId + 'studentId= ' + req.tokenPayloadData.sub);
    return this.tasksService.getTaskAttemptData(Number(taskId), req.user.id);
  }

  /**
   * Retrieves task attempt data for a specific student.
   *
   * @param courseId - The ID of the course.
   * @param taskId - The ID of the task.
   * @param studentId - The ID of the student.
   * @returns A Promise that resolves to the taskAttemptDataDTO object.
   * @throws Error if any of the provided IDs are invalid.
   */
  /* @Get('taskAttempt/:courseId/:taskId/:studentId')
  async getTaskAttemptDataByStudent(@Param('courseId') courseId: number, @Param('taskId')taskId: number, @Param('studentId')studentId: number): Promise<taskAttemptDataDTO> {
    if (isNaN(courseId)) {
      throw new Error('Invalid courseId');
    }
    if (isNaN(taskId)) {
      throw new Error('Invalid taskId');
    }
    if (isNaN(studentId)) {
      throw new Error('Invalid studentId');
    }
    console.log('LOG VOM SERVER-CONTROLLER ' + 'taskId= ' + taskId + 'CourseId= ' + courseId + 'studentId= ' + studentId);
    return this.tasksService.getTaskAttemptData(Number(courseId), Number(taskId), Number(studentId));
  } */

  /**
   * Sets the task attempt data.
   *
   * @param taskAttemptData - The task attempt data to be set.
   * @returns A Promise that resolves to the taskAttemptDataDTO object.
   */
  @roles('ANY')
  @Post('taskAttempt')
  setTaskAttemptData(@Body() taskAttemptData: taskAttemptDataDTO, @Req() req): Promise<taskAttemptDataDTO> {
    return this.tasksService.setTaskAttemptData(taskAttemptData, req.user.id);
  }

  @roles('ANY')
  @Get('generateUmlFeedback/:taskId')
  generateUmlFeedback(@Req() req, @Param('taskId') taskAttempt: number): Promise<{response: string}> {
    console.log("###### generation for taskId:", taskAttempt);
    if (isNaN(Number(taskAttempt))) {
      throw new Error('Invalid taskId');
    }
    return this.tasksService.generateUmlFeedback(Number(taskAttempt), req.user.id);
  }

  /**
   * Sets the task attempt data and the feedback data.
   *
   * @param taskAttemptData - The task attempt data to be set.
   * @returns A Promise that resolves to the reached points.
   */
  @roles('ANY')
  @Post('commitAttempt')
  commitAttemptGetPoints(@Body() taskAttemptData: taskAttemptDataDTO, @Req() req): Promise<{points: number, highlightData: editorDataDTO}> {
    return this.tasksService.commitAttemptGetPoints(taskAttemptData, req.user.id);
  }

  /**
   * Retrieves the feedback data for a specific attempt.
   * @param attemptId The ID of the attempt.
   * @returns A Promise that resolves to the taskFeedbackDataDTO object containing the feedback data.
   */
  /* @Get('taskFeedback/:attemptId')
  async getFeedbackData(@Param('attemptId') attemptId: number): Promise<taskFeedbackDataDTO> {
    return this.tasksService.getTaskFeedbackData(Number(attemptId));
  } */

  /**
   * Sets the task feedback data.
   *
   * @param {taskFeedbackDTO} taskFeedbackData - The task feedback data.
   * @param {tokenRequestDTO} req - The request object containing the token payload data.
   * @returns {Promise<taskFeedbackDTO>} A promise that resolves to the created task feedback data.
   */
  /* @roles('TEACHER, ADMIN')
  @Post('taskFeedback')
  setTaskFeedbackData(@Body() taskFeedbackData: taskFeedbackDTO, @Request() req: tokenRequestDTO): Promise<taskFeedbackDTO> {
    console.log('FEEDBACK')
    console.log(taskFeedbackData);
    return this.tasksService.createFeedback(taskFeedbackData, req.tokenPayloadData.sub);
  } */

  /**
   * Deletes a task.
   *
   * @param {tokenRequestDTO} req - The request object containing the token.
   * @param {string} taskId - The ID of the task to be deleted.
   * @returns {Promise<taskInformationDTO>} - A promise that resolves to the deleted task information.
   */
  /* @roles('TEACHER, ADMIN')
  @Delete('taskDeletion/:taskId')
  deleteTask(@Request() req: tokenRequestDTO, @Param('taskId') taskId: string): Promise<taskInformationDTO> {
    console.log('controller: deleteTask');
    console.log(taskId);
    return this.tasksService.deleteTask(Number(taskId));
  } */

  /**
   * Retrieves task data for a given taskId.
   *
   * @param taskId - The ID of the task to retrieve data for.
   * @returns A Promise that resolves to a taskDataDTO object containing the task data.
   * @throws Error if the taskId is not a valid number.
   */
  @roles('ANY')
  @Get('taskWorkspace/:taskId')
  async getTaskData(@Param('taskId') taskId : number): Promise<taskDataDTO> {
    if (isNaN(taskId)) {
      throw new Error('Invalid taskId');
    }
    console.log('DatabaseTaskCommunicationController: getTaskData()');
  return this.tasksService.getTaskData(Number(taskId));
  }

    /**
   * Retrieves the workspace data for a specific task.
   *
   * @param taskId - The ID of the task.
   * @returns A Promise that resolves to a taskWorkspaceDataDTO object.
   * @throws Error if the taskId is invalid.
   */
  @roles('ANY')
  @Get('taskWorkspaceData/:taskId')
  async getTaskWorkspaceData(@Param('taskId') taskId : number): Promise<taskWorkspaceDataDTO> {
    if (isNaN(taskId)) {
      throw new Error('Invalid taskId');
    }
    console.log('DatabaseTaskCommunicationController: getTaskWorkspaceData()');
  return this.tasksService.getTaskWorkspaceData(Number(taskId));
  }

  /**
   * Retrieves task feedback data for a specific student.
   *
   * @param req - The request object containing the token and payload data.
   * @param courseId - The ID of the course.
   * @param taskId - The ID of the task.
   * @param studentId - The ID of the student.
   * @returns A Promise that resolves to the task feedback data.
   * @throws Error if the input is invalid or the student ID is not valid for the current user.
   */
  /* @Get('taskFeedback/:courseId/:taskId/:studentId')
  async getTaskFeedbackDataByStudent(@Request() req: tokenRequestDTO, @Param('courseId') courseId: number, @Param('taskId') taskId: number, @Param('studentId') studentId: number): Promise<taskFeedbackDataDTO> {
    if (isNaN(courseId) || isNaN(taskId) || isNaN(studentId)) {
      throw new Error('Invalid input');
    }
    if (req.tokenPayloadData.globalRole === 'STUDENT' && req.tokenPayloadData.sub !== Number(studentId)) {
      throw new Error('Invalid studentId');
    }
    return this.tasksService.getTaskFeedbackDataByStudent(Number(courseId), Number(taskId), Number(studentId), req.tokenPayloadData.globalRole);
  } */

  /**
   * Retrieves task feedback data for a specific course.
   * @param courseId - The ID of the course.
   * @returns A promise that resolves to an array of taskFeedbackDataDTO objects.
   */
  /* @Get('coursePageLecturer/:courseId')
  async getTaskFeedbackDataByCourse(@Param('courseId') courseId: number): Promise<taskFeedbackDataDTO[]> {
    return this.tasksService.getTaskFeedbackDataByCourse(Number(courseId));
  } */

  /**
   * Retrieves the status of a student's task.
   *
   * @param courseId - The ID of the course.
   * @param taskId - The ID of the task.
   * @returns A promise that resolves to an array of studentTaskStatusDTO objects.
   */
  /* @Get('coursePageLecturer/studentTaskStatus/:courseId/:taskId')
  async getStudentTaskStatus(@Param('courseId') courseId: number, @Param('taskId')taskId: number): Promise<studentTaskStatusDTO[]> {
    console.log('DatabaseTaskCommunicationController: getStudentTaskStatus()');
    return this.tasksService.getStudentTaskStatus(Number(courseId), Number(taskId));
  } */

  /**
   * Checks if there are any task attempts for a given task ID.
   * @param taskId - The ID of the task to check for attempts.
   * @returns A Promise that resolves to a boolean indicating whether there are any task attempts.
   * @throws Error if the taskId is invalid (not a number).
   */
  /* @roles('TEACHER, ADMIN')
  @Get('checkForTaskAttempts/:taskId/')
  async checkForTaskAttempts(@Param('taskId')taskId: number): Promise<boolean> {
    if (isNaN(taskId)) {
      throw new Error('Invalid taskId');
    }
    return this.tasksService.checkForTaskAttempts(Number(taskId));
  } */

  /**
   * Checks if there are any task attempts for a given course and task.
   * @param courseId - The ID of the course.
   * @param taskId - The ID of the task.
   * @returns A Promise that resolves to a boolean indicating whether there are any task attempts for the given course and task.
   * @throws Error if the input is invalid (courseId or taskId is NaN).
   */
  /* @roles('TEACHER, ADMIN')
  @Get('checkForTaskAttemptsForTask/:courseId/:taskId/')
  async checkForTaskAttemptsForCourse(@Param('courseId') courseId: number, @Param('taskId')taskId: number): Promise<boolean> {
    if (isNaN(courseId) || isNaN(taskId)) {
      throw new Error('Invalid input');
    }
    return this.tasksService.checkForTaskAttemptsForCourse(Number(courseId), Number(taskId));
  } */

  /**
   * Checks if there are any task attempts for a given course and student.
   * @param courseId - The ID of the course.
   * @param studentId - The ID of the student.
   * @returns A Promise that resolves to a boolean indicating whether there are any task attempts for the given course and student.
   * @throws Error if the input is invalid (courseId or studentId is NaN).
   */
  /* @roles('TEACHER, ADMIN')
  @Get('checkForTaskAttemptsForCourseAndStudent/:courseId/:studentId/')
  async checkForTaskAttemptsForCourseAndStudent(@Param('courseId') courseId: number, @Param('studentId')studentId: number): Promise<boolean> {
    if (isNaN(courseId) || isNaN(studentId)) {
      throw new Error('Invalid input');
    }
    return this.tasksService.checkForTaskAttemptsForCourseAndStudent(Number(courseId), Number(studentId));
  } */

}
