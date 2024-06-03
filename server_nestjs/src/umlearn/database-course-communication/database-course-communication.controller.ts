import { Controller, Get, Param, Request, Post, Delete, Body, UseGuards } from '@nestjs/common';
import { courseCreationDTO, courseOverviewDataDTO, tokenRequestDTO, coursePageLecturerDataDTO, coursePageStudentDataDTO, courseDTO, tasksForCourseDTO, tasksInformationDTO, userDTO, taskAttemptDTO } from '@DTOs/index';
import { DatabaseCourseCommunicationService } from './database-course-communication.service';
import { RolesGuard, roles } from '@/auth/roles.guard';


@UseGuards(RolesGuard)
@Controller('course')
export class DatabaseCourseCommunicationController {

  constructor(private dccs: DatabaseCourseCommunicationService) {}

  /**
   * Gets the course overview data from the server
   * @param userId
   * @returns courseOverviewDataDTO
   */
  @Get('courseOverview/')
  async getCourseOverviewData(@Request() req: tokenRequestDTO): Promise<courseOverviewDataDTO> {
    if (isNaN(req.tokenPayloadData.sub)) {
      throw new Error('Invalid userId');
    }
    console.log('DatabaseCourseCommunicationController: getCourseOverviewData()' + req.tokenPayloadData.sub);
    return this.dccs.getCourseOverviewData(Number(req.tokenPayloadData.sub));
  }

  /**
   * Retrieves tasks data for a specific course.
   * @param courseId - The ID of the course.
   * @returns A Promise that resolves to a tasksForCourseDTO object.
   * @throws Error if the courseId is invalid.
   */
  @Get('courseOverview/:courseId')
  async getTasksForCourseData(@Param('courseId') courseId: number): Promise<tasksForCourseDTO> {
    if (isNaN(courseId)) {
      throw new Error('Invalid courseId');
    }
    console.log('DatabaseCourseCommunicationController: getTasksForCourseData()');
    return this.dccs.getTasksForCourseData(Number(courseId));
  }


  /**
   * Retrieves course page lecturer data for a given course ID.
   * @param courseId The ID of the course to retrieve data for.
   * @returns A Promise that resolves to a coursePageLecturerDataDTO object.
   * @throws An error if the courseId is not a valid number.
   */
  @roles('TEACHER, ADMIN')
  @Get('coursePageLecturer/:courseId')
  async getCoursePageLecturerData(@Param('courseId') courseId : number): Promise<coursePageLecturerDataDTO> {
    console.log("dbc-controller: courseId: " + courseId);
    if (isNaN(courseId)) {
      throw new Error('Invalid courseId');
    }
    console.log('DatabaseCourseCommunicationController: getCoursePageLecturerData()');
    return this.dccs.getCoursePageLecturerData(Number(courseId));
  }


  /**
   * Retrieves task attempts data for a given course and task ID.
   * @param courseId The ID of the course.
   * @param taskId The ID of the task.
   * @returns A Promise that resolves to a taskAttemptsDTO object.
   * @throws An error if either courseId or taskId is not a number.
   */
  @roles('TEACHER, ADMIN')
  @Get('coursePageLecturer/:courseId/:taskId')
  async getTaskAttemptData(@Param('courseId') courseId: number, @Param('taskId') taskId: number): Promise<taskAttemptDTO[]> {
    if (isNaN(courseId) || isNaN(taskId)) {
      throw new Error('Invalid userId');
    }
    console.log('DatabaseCourseCommunicationController: getTaskAttemptsData()');
    return this.dccs.getTaskAttemptData(Number(courseId), Number(taskId));
  }

  /**
   * Creates a new course.
   *
   * @param courseTitle - The title of the course.
   * @param req - The request object containing the token payload data.
   * @returns A promise that resolves to the course creation DTO.
   */
  @roles('TEACHER, ADMIN')
  @Post('create')
  createCourse(@Body() courseTitle:{data:string} , @Request() req: tokenRequestDTO): Promise<courseCreationDTO> {
    return this.dccs.createCourse(courseTitle.data, req.tokenPayloadData.sub);
  }

  /**
   * Retrieves the student data for a specific course page.
   *
   * @param courseId - The ID of the course.
   * @returns A Promise that resolves to the coursePageStudentDataDTO object.
   * @throws Error if the courseId is invalid.
   */
  @Get("coursePageStudent/:courseId")
  async getCoursePageStudentData(@Param('courseId') courseId : number): Promise<coursePageStudentDataDTO> {
    if (isNaN(courseId)) {
      throw new Error('Invalid courseId');
    }
    console.log('DatabaseCourseCommunicationController: getCoursePageStudentData()');
    return this.dccs.getCoursePageStudentData(Number(courseId));
  }


  /**
   * Retrieves course data for a given course ID.
   * @param courseId - The ID of the course to retrieve data for.
   * @returns A Promise that resolves to a courseDTO object containing the course data.
   * @throws An error if the courseId is not a number.
   */
  @roles('TEACHER, ADMIN')
  @Get('courseEdit/course/:courseId')
  async getCourseData(@Param('courseId') courseId : number): Promise<courseDTO> {
    if (isNaN(courseId)) {
      throw new Error('Invalid courseId');
    }
    console.log('DatabaseCourseCommunicationController: getCourseData()');
    return this.dccs.getCourseData(Number(courseId));
  }


  /**
   * Retrieves tasks data for a given course ID.
   * @param courseId - The ID of the course to retrieve tasks data for.
   * @returns A Promise that resolves to a tasksInformationDTO object.
   * @throws An error if the courseId is not a number.
   */
  @Get('courseEdit/tasks/:courseId')
  async getTasksData(@Param('courseId') courseId : number): Promise<tasksInformationDTO> {
    if (isNaN(courseId)) {
      throw new Error('Invalid courseId');
    }
    console.log('DatabaseCourseCommunicationController: getTasksData()');
    return this.dccs.getTasksData(Number(courseId));
  }


  /**
   * Retrieves data for all students enrolled in a given course.
   * @param courseId The ID of the course to retrieve data for.
   * @returns A Promise that resolves to a studentsDTO object containing the data for all students in the course.
   * @throws An error if the courseId is not a number.
   */
  @roles('TEACHER, ADMIN')
  @Get('courseEdit/students/:courseId')
  async getStudentsData(@Param('courseId') courseId : number): Promise<userDTO[]> {
    if (isNaN(courseId)) {
      throw new Error('Invalid courseId');
    }
    console.log('DatabaseCourseCommunicationController: getStudentsData()');
    return this.dccs.getStudentsData(Number(courseId));
  }

  /**
   * Retrieves data for all students.
   * @returns A Promise that resolves to an array of userDTO objects representing the student data.
   */
  @roles('TEACHER, ADMIN')
  @Get('courseEdit/allStudents')
  async getAllStudentsData(): Promise<userDTO[]> {
    console.log('DatabaseCourseCommunicationController: getAllStudentsData()');
    return this.dccs.getAllStudentsData();
  }

  /**
   * Updates the course data in the database.
   * @param courseData The course data to be updated.
   * @returns A Promise that resolves to the updated course data.
   */
  @roles('TEACHER, ADMIN')
  @Post('courseEdit/updateCourseData')
  updateCourseData(@Body() courseData: courseDTO): Promise<courseDTO> {
    return this.dccs.updateCourseData(courseData);
  }

  /**
   * Updates tasks assigned to a course in the database.
   * @param courseId The ID of the course to update tasks information for.
   * @param taskData The tasks information to update.
   * @returns A Promise that resolves to the updated tasks information.
   * @throws An error if the courseId is not a number.
   */
  @roles('TEACHER, ADMIN')
  @Post('courseEdit/updateTasksForCourseData/:courseId')
  updateTasksForCourseData(@Param('courseId') courseId: number, @Body() taskData: tasksInformationDTO): Promise<tasksInformationDTO> {
    if (isNaN(courseId)) {
      throw new Error('Invalid courseId');
    }
    return this.dccs.updateTasksForCourseData(Number(courseId), taskData);
  }

  /**
   * Removes a student from a course.
   * @param courseId The ID of the course.
   * @param studentId The ID of the student.
   * @returns A Promise that resolves to the updated student data.
   * @throws An error if either courseId or studentId is not a number.
   */
  @roles('TEACHER, ADMIN')
  @Delete('courseEdit/removeStudentFromCourse/:courseId/:studentId')
  async removeStudentFromCourse(@Param('courseId') courseId: number, @Param('studentId') studentId: number): Promise<userDTO> {
    if (isNaN(courseId) || isNaN(studentId)) {
      throw new Error('Invalid courseId or studentId');
    }
    return this.dccs.removeStudentFromCourse(Number(courseId), Number(studentId));
  }

  /**
   * Removes a task from a course.
   * @param courseId The ID of the course.
   * @param taskId The ID of the task to be removed.
   * @returns A Promise that resolves to the updated tasks information.
   * @throws An error if either courseId or taskId is not a number.
   */
  @roles('TEACHER, ADMIN')
  @Delete('courseEdit/removeTaskFromCourse/:courseId/:taskId')
  async removeTaskFromCourse(@Param('courseId') courseId: number, @Param('taskId') taskId: number): Promise<tasksInformationDTO> {
    if (isNaN(courseId) || isNaN(taskId)) {
      throw new Error('Invalid courseId or taskId');
    }
    return this.dccs.removeTaskFromCourse(Number(courseId), Number(taskId));
  }

  /**
   * Adds a student to a course.
   * @param courseId - The ID of the course to add the student to.
   * @param studentId - The ID of the student to add to the course.
   * @returns A Promise that resolves to a userDTO object representing the added student.
   * @throws An error if either courseId or studentId is not a number.
   */
  @roles('TEACHER, ADMIN')
  @Post('courseEdit/addStudentToCourse/:courseId/:studentId')
  async addStudentToCourse(@Param('courseId') courseId: number, @Param('studentId') studentId: number): Promise<userDTO> {
    if (isNaN(courseId) || isNaN(studentId)) {
      throw new Error('Invalid courseId or studentId');
    }
    return this.dccs.addStudentToCourse(Number(courseId), Number(studentId));
  }

  /**
   * Deletes a course with the given courseId.
   * @param courseId - The id of the course to be deleted.
   * @returns A Promise that resolves to the deleted course as a courseDTO object.
   * @throws An error if the courseId is not a number.
   */
  @roles('TEACHER, ADMIN')
  @Delete('courseEdit/deleteCourse/:courseId')
  async deleteCourse(@Param('courseId') courseId: number): Promise<courseDTO> {
    if (isNaN(courseId)) {
      throw new Error('Invalid courseId');
    }
    return this.dccs.deleteCourse(Number(courseId));
  }

}
