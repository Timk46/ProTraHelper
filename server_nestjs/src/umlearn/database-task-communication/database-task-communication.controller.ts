import { Body, Controller, Get, Post, Param, Req, UseGuards } from '@nestjs/common';
import { DatabaseTaskCommunicationService } from './database-task-communication.service';
import { taskDataDTO, taskWorkspaceDataDTO } from '@DTOs/index';
import { taskAttemptDataDTO } from '@DTOs/index';
import { roles, RolesGuard } from '@/auth/common/guards/roles.guard';

@UseGuards(RolesGuard)
@Controller('database-task-communication')
export class DatabaseTaskCommunicationController {
  constructor(private readonly tasksService: DatabaseTaskCommunicationService) {}

  /**
   * Retrieves the image associated with a task.
   * @param taskId - The ID of the task.
   * @returns A promise that resolves to an object containing the base64-encoded image.
   * @throws Error if the taskId is invalid.
   */
  @roles('TEACHER', 'ADMIN')
  @Get('getTaskImage/:taskId')
  async getTaskImage(@Param('taskId') taskId: number): Promise<{ imageB64: string }> {
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
  async getTaskAttemptData(
    @Param('taskId') taskId: number,
    @Req() req,
  ): Promise<taskAttemptDataDTO> {
    if (isNaN(taskId)) {
      throw new Error('Invalid taskId');
    }
    //console.log('LOG VOM SERVER-CONTROLLER ' + 'taskId= ' + taskId + 'CourseId= ' + courseId + 'studentId= ' + req.tokenPayloadData.sub);
    return this.tasksService.getTaskAttemptData(Number(taskId), req.user.id);
  }

  /**
   * Sets the task attempt data.
   *
   * @param taskAttemptData - The task attempt data to be set.
   * @returns A Promise that resolves to the taskAttemptDataDTO object.
   */
  @roles('ANY')
  @Post('taskAttempt')
  setTaskAttemptData(
    @Body() taskAttemptData: taskAttemptDataDTO,
    @Req() req,
  ): Promise<taskAttemptDataDTO> {
    return this.tasksService.setTaskAttemptData(taskAttemptData, req.user.id);
  }

  @roles('ANY')
  @Get('generateUmlFeedback/:taskId')
  generateUmlFeedback(
    @Req() req,
    @Param('taskId') taskAttempt: number,
  ): Promise<{ response: string }> {
    console.log('###### generation for taskId:', taskAttempt);
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
  commitAttemptGetPoints(
    @Body() taskAttemptData: taskAttemptDataDTO,
    @Req() req,
  ): Promise<{ points: number }> {
    return this.tasksService.commitAttemptGetPoints(taskAttemptData, req.user.id);
  }

  /**
   * Retrieves task data for a given taskId.
   *
   * @param taskId - The ID of the task to retrieve data for.
   * @returns A Promise that resolves to a taskDataDTO object containing the task data.
   * @throws Error if the taskId is not a valid number.
   */
  @roles('TEACHER', 'ADMIN')
  @Get('taskWorkspace/:taskId')
  async getTaskData(@Param('taskId') taskId: number): Promise<taskDataDTO> {
    if (isNaN(taskId)) {
      throw new Error('Invalid taskId');
    }
    console.log('DatabaseTaskCommunicationController: getTaskData()');
    return this.tasksService.getTaskData(Number(taskId));
  }

  /**
   * Retrieves the workspace data for a specific task.
   * This data has no solution and is used for the student view.
   *
   * @param taskId - The ID of the task.
   * @returns A Promise that resolves to a taskWorkspaceDataDTO object.
   * @throws Error if the taskId is invalid.
   */
  @roles('ANY')
  @Get('taskWorkspaceData/:taskId')
  async getTaskWorkspaceData(@Param('taskId') taskId: number): Promise<taskWorkspaceDataDTO> {
    if (isNaN(taskId)) {
      throw new Error('Invalid taskId');
    }
    console.log('DatabaseTaskCommunicationController: getTaskWorkspaceData()');
    return this.tasksService.getTaskWorkspaceData(Number(taskId));
  }
}
