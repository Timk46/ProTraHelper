import { courseCreationDTO, courseOverviewDataDTO, coursePageLecturerDataDTO, coursePageStudentDataDTO, courseDTO, tasksForCourseDTO, tasksInformationDTO, userDTO, taskAttemptDTO} from '@DTOs/index';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';


@Injectable()
export class DatabaseCourseCommunicationService {

  constructor(private prisma: PrismaService) {}


  /**
   * Retrieves course overview data for a given user.
   * @param userId - The ID of the user.
   * @returns A Promise that resolves to a courseOverviewDataDTO object.
   * @throws Error if no data is found.
   */
  async getCourseOverviewData(userId: number): Promise<courseOverviewDataDTO> {
    try {
      const courseData = await this.prisma.course.findMany({
        where: {
          OR: [
            {
              students: {
                some: {
                  id: userId
                }
              }
            },
            {
              lecturerId: userId
            }
          ]
        },
        select: {
          id: true,
          title: true,
          subtitle: true,
          description: true,
          lecturer: {
            select: {
              firstname: true,
              lastname: true,
            }
          }
        }
      });
  
      const taskData = await this.prisma.tasksForCourse.findMany({
        where: {
          OR: [
            {
              course: {
                students: {
                  some: {
                    id: userId
                  }
                }
              }
            },
            {
              course: {
                lecturerId: userId
              }
            }
          ],
        },
        select: {
          id: true,
          task: {
            select: {
              id: true,
              title: true,
            }
          },
          course: {
            select: {
              id: true,
              title: true,
            }
          },
          deadline: true,
        }
      });
  
      if (courseData === null || taskData === null) {
        throw new Error('No data found');
      }
  
      const tasksWithFeedbackStatus = await Promise.all(taskData.map(async task => {
        const studentCount = await this.prisma.user.count({
          where: {
            courseMember: {
              some: {
                id: task.course.id
              }
            }
          }
        });
  
        const feedbackCount = await this.prisma.feedback.count({
          where: {
            taskAttempt: {
              taskId: task.task.id,
              courseId: task.course.id
            }
          }
        });
  
        const isFeedbackComplete = studentCount === feedbackCount;
  
        return {
          taskId: task.task.id,
          taskTitle: task.task.title,
          deadline: task.deadline,
          courseTitle: task.course.title,
          isFeedbackComplete: isFeedbackComplete
        }
      }));
  
      return {
        courses: courseData.map(course => {
          return {
            courseId: course.id,
            courseTitle: course.title,
            courseSubTitle: course.subtitle,
            courseLecturer: course.lecturer.firstname + ' ' + course.lecturer.lastname,
            courseDescription: course.description,
          }
        }),
        tasks: tasksWithFeedbackStatus
      };
    } catch (error) {
      throw new HttpException('Fehler beim Laden der Daten', HttpStatus.BAD_REQUEST);
    }
  }

  /**
   * Retrieves tasks for a specific course.
   * @param courseId - The ID of the course.
   * @returns A Promise that resolves to a tasksForCourseDTO object containing the course ID and task information.
   * @throws Error if no data is found.
   */
  async getTasksForCourseData(courseId: number): Promise<tasksForCourseDTO> {
    try{
      const taskData = await this.prisma.tasksForCourse.findMany({
        where: {
          courseId: courseId
        },
        select: {
          id: true,
          task: {
            select: {
              id: true,
              title: true,
              description: true,
            },
          },
          deadline: true,
        }
      });

      if (taskData === null) {
        throw new Error('No data found');
      }

      return {
        courseId: courseId,
        tasksInformations: taskData.map(task => ({
          taskId: task.task.id,
          taskTitle: task.task.title,
          taskDescription: task.task.description,
          deadline: task.deadline,
        })),
      };
    } catch (error) {
      throw new HttpException('Fehler beim Laden der Daten', HttpStatus.BAD_REQUEST);
    }
  }

  /**
   * Retrieves the lecturer data for a specific course page.
   * @param givenCourseId - The ID of the course.
   * @returns A Promise that resolves to a coursePageLecturerDataDTO object containing the lecturer data.
   */
  async getCoursePageLecturerData(givenCourseId: number): Promise<coursePageLecturerDataDTO> {
    try{
      const students = await this.prisma.course.findMany({
        where: {
          id: givenCourseId
        },
        select: {
          students: true
        }
      });

      const courseData = await this.prisma.course.findFirst({
        where: {
          id: givenCourseId
        },
        select: {
          id: true,
          title: true,
          description: true,
          lecturer: {
            select: {
              firstname: true,
              lastname: true,
            }
          }
        }
      });

      const taskData = await this.prisma.tasksForCourse.findMany({
        where: {
          courseId: givenCourseId,
          },
          select: {
            taskId: true,
            task: {
              select: {
                title: true,
              }
            },
            deadline: true,
          }
        });
      const description = taskData.length > 0 ? await this.prisma.task.findUnique({
        where: {
          id: taskData[0].taskId
        },
        select: {
          description: true,
        }
      })
      :null;
      const feedbacks = await this.prisma.feedback.findMany({
        where: {
          taskAttempt:{
            courseId: givenCourseId,
          }
      },
      select: {
        id: true,
        taskAttempt: {
          select: {
            taskId: true,
          }
        }
      }
      });
      return {
        studentCount: students[0].students.length,
        course: {
          courseId: courseData.id,
          courseTitle: courseData.title,
          courseLecturer: courseData.lecturer.firstname + ' ' + courseData.lecturer.lastname,
          courseDescription: courseData.description,
        },
        tasks: taskData.map(task => {
          return {
            taskId: task.taskId,
            taskTitle: task.task.title,
            taskDescription: description ? description.description : null,
            deadline: task.deadline,
            feedbackCount: feedbacks.filter(feedback => feedback.taskAttempt.taskId === task.taskId).length,
          }
        })
      };
    } catch (error) {
      throw new HttpException('Fehler beim Laden der Daten', HttpStatus.BAD_REQUEST);
    }
  }



  /**
   * Retrieves the student data for a given course.
   * @param givenCourseId - The ID of the course.
   * @returns A Promise that resolves to a coursePageStudentDataDTO object.
   * @throws Error if no data is found.
   */
  async getCoursePageStudentData(givenCourseId: number): Promise<coursePageStudentDataDTO> {
    try{
      const courseData = await this.prisma.course.findUnique({
        where: {
          id: givenCourseId
        },
        select: {
          id: true,
          title: true,
          description: true,
          lecturer: {
            select: {
              firstname: true,
              lastname: true,
            }
          }
        }
      });
      const feedbacks = await this.prisma.feedback.findMany({
        where: {
          taskAttempt:{
            courseId: givenCourseId,
          }
      },
      select: {
        id: true,
        taskAttempt: {
          select: {
            taskId: true,
          }
        }
      }
      });
      const taskData = await this.prisma.tasksForCourse.findMany({
        where: {
          courseId: givenCourseId
        },
        select: {
          id: true,
          task: {
            select: {
              id: true,
              title: true,
              description: true,
            }
          },
          deadline: true,
        }
      });

      if (courseData === null || taskData === null) {
        throw new Error('No data found');
      }

      return {
        course: {
          courseId: courseData.id,
          courseTitle: courseData.title,
          courseLecturer: courseData.lecturer.firstname + ' ' + courseData.lecturer.lastname,
          courseDescription: courseData.description
        },
        tasks: taskData.map(task => {
          return {
            taskId: task.task.id,
            taskTitle: task.task.title,
            deadline: task.deadline,
            taskDescription: task.task.description,
            feedbackCount: feedbacks.filter(feedback => feedback.taskAttempt.taskId === task.task.id).length,
          }
        })
      };
    } catch (error) {
      throw new HttpException('Fehler beim Laden der Daten', HttpStatus.BAD_REQUEST);
    }
  }



  /**
   * Retrieves task attempt data for a given course and task.
   * @param givenCourseId - The ID of the course.
   * @param givenTaskId - The ID of the task.
   * @returns A promise that resolves to an array of taskAttemptDTO objects.
   */
  async getTaskAttemptData(givenCourseId: number, givenTaskId: number): Promise<taskAttemptDTO[]> {
    try{
      const courseStudents = await this.prisma.course.findUnique({
        where: {
          id: givenCourseId,
        },
        select: {
          students: {
            select: {
              id: true,
              firstname: true,
              lastname: true,
              taskAttempt: {
                where: {
                  taskId: givenTaskId,
                },
                select: {
                  id: true,
                  feedback: {
                    select: {
                      id: true,
                    }
                  }
                }
              }
            }
          }
        }
      });
      return courseStudents.students.map(courseStudent => ({
        student: {
          id: courseStudent.id,
          firstname: courseStudent.firstname,
          lastname: courseStudent.lastname,
        },
        taskAttemptId: courseStudent.taskAttempt[0]?.id,
        feedbackId: courseStudent.taskAttempt[0]?.feedback[0]?.id,
      }));
    } catch (error) {
      throw new HttpException('Fehler beim Laden der Daten', HttpStatus.BAD_REQUEST);
    }
  }

  /**
   * Creates a new course with the given title and lecturer ID.
   *
   * @param courseTitle - The title of the course.
   * @param lecturerId - The ID of the lecturer.
   * @returns A Promise that resolves to a courseCreationDTO object containing the ID, title, and description of the created course.
   */
  async createCourse(courseTitle: string, lecturerId: number): Promise<courseCreationDTO> {
    try{
      const course = await this.prisma.course.create({
        data: {
          title: courseTitle,
          description: 'Hier Kursbeschreibung einfügen',
          lecturer: {connect: {id: lecturerId}},
        },
      });
      return {
        id: course.id,
        courseTitle: course.title,
        courseDescription: course.description,
      };
    } catch (error) {
      throw new HttpException('Fehler beim Speichern der Daten', HttpStatus.BAD_REQUEST);
    }
  }

  /**
   * Retrieves course data for a given course ID.
   * @param givenCourseId - The ID of the course to retrieve data for.
   * @returns A Promise that resolves to a courseDTO object containing the course data.
   * @throws An error if no data is found for the given course ID.
   */
  async getCourseData(givenCourseId: number): Promise<courseDTO> {
    try{
      const courseData = await this.prisma.course.findUnique({
        where: {
          id: givenCourseId
        },
        select: {
          id: true,
          title: true,
          subtitle: true,
          description: true,
          lecturer: {
            select: {
              firstname: true,
              lastname: true,
            }
          }
        }
      });

      if (courseData === null) {
        throw new Error('No data found');
      }

      return {
        courseId: courseData.id,
        courseTitle: courseData.title,
        courseSubTitle: courseData.subtitle,
        courseLecturer: courseData.lecturer.firstname + ' ' + courseData.lecturer.lastname,
        courseDescription: courseData.description
      };
    } catch (error) {
      throw new HttpException('Fehler beim Laden der Daten', HttpStatus.BAD_REQUEST);
    }
  }

  /**
   * Retrieves tasks data for a given course ID.
   * @param givenCourseId The ID of the course to retrieve tasks data for.
   * @returns A Promise that resolves to a tasksInformationDTO object containing information about the tasks.
   * @throws An error if no data is found for the given course ID.
   */
  async getTasksData(givenCourseId: number): Promise<tasksInformationDTO> {
    try{
      const tasks = await this.prisma.tasksForCourse.findMany({
        where: {
          courseId: givenCourseId
        },
        select: {
          id: true,
          task: {
            select: {
              id: true,
              title: true,
              description: true,
            },
          },
          deadline: true,
        }
      });

      if (tasks === null) {
        throw new Error('No data found');
      }

      return {
        tasksInformations: tasks.map(task => ({
          taskId: task.task.id,
          taskTitle: task.task.title,
          taskDescription: task.task.description,
          deadline: task.deadline,
        })),
      };
    } catch (error) {
      throw new HttpException('Fehler beim Laden der Daten', HttpStatus.BAD_REQUEST);
    }
  }

  /**
   * Retrieves data of all students enrolled in a given course.
   * @param courseId - The ID of the course to retrieve student data for.
   * @returns A Promise that resolves to an object containing an array of student data.
   * @throws An error if no data is found for the given course ID.
   */
  async getStudentsData(courseId: number): Promise<userDTO[]> {
    try{ 
      const students = await this.prisma.course.findUnique({
        where: {
          id: courseId
        },
        select: {
          students: true
        }
      }).students();

      if (students === null) {
        throw new Error('No data found');
      }

      return students.map(student => ({
          id: student.id,
          firstname: student.firstname,
          lastname: student.lastname,
        }));
      } catch (error) {
        throw new HttpException('Fehler beim Laden der Daten', HttpStatus.BAD_REQUEST);
      }
    }



  /**
   * Retrieves data for all students.
   * @returns A promise that resolves to an array of userDTO objects representing the students' data.
   */
  async getAllStudentsData(): Promise<userDTO[]> {
    try{
      const students = await this.prisma.user.findMany({
        where: {
          globalRole: 'STUDENT'
        },
        select: {
          id: true,
          firstname: true,
          lastname: true,
        }
      });

      return students.map(student => ({
        id: student.id,
        firstname: student.firstname,
        lastname: student.lastname,
      }));
    } catch (error) {
      throw new HttpException('Fehler beim Laden der Daten', HttpStatus.BAD_REQUEST);
    }
  }


  /**
   * Updates the course data in the database.
   * @param courseData - The updated course data.
   * @returns A Promise that resolves to the updated course data.
   */
  async updateCourseData(courseData: courseDTO): Promise<courseDTO> {
    try{
      const changedData = await this.prisma.course.update({
        where: {
          id: courseData.courseId,
        },
        data: {
          title: courseData.courseTitle,
          subtitle: courseData.courseSubTitle,
          description: courseData.courseDescription,
        },
      });

      return {
        courseId: changedData.id,
        courseTitle: changedData.title,
        courseSubTitle: changedData.subtitle,
        courseLecturer: courseData.courseLecturer,
        courseDescription: changedData.description
      }
    } catch (error) {
      throw new HttpException('Fehler beim Speichern der Daten', HttpStatus.BAD_REQUEST);
    }
  }

  /**
   * Updates the tasks assigned to a given course in the database.
   * Deletes the existing tasks for the course and creates new tasks based on the provided task data.
   * Returns the updated tasks for the course.
   *
   * @param courseId - The ID of the course to update tasks for.
   * @param taskData - The task data to use for updating the tasks.
   * @returns The updated tasks for the course.
   */
  async updateTasksForCourseData(courseId: number, taskData: tasksInformationDTO): Promise<tasksInformationDTO> {
    try{
      // delete the tasks for the course
      const deletedData = await this.prisma.tasksForCourse.deleteMany({
        where: {
          courseId: courseId,
        },
      });

      if (deletedData === null) {
        console.log('No data deleted');
      }

      // create the tasks for the course
      const changedData = await this.prisma.tasksForCourse.createMany({
        data: taskData.tasksInformations.map(task => ({
          courseId: courseId,
          taskId: task.taskId,
          deadline: task.deadline,
        })),
      });

      if (changedData === null) {
        console.log('No data created');
      }

      // return the tasks for the course to check if they were created
      const returnedData = await this.prisma.tasksForCourse.findMany({
        where: {
          courseId: courseId,
        },
        select: {
          task: {
            select: {
              id: true,
              title: true,
              description: true,
            },
          },
          deadline: true,
        }
      });

      if (returnedData === null) {
        throw new Error('No data found');
      }

      return {
        tasksInformations: returnedData.map(task => ({
          taskId: task.task.id,
          taskTitle: task.task.title,
          taskDescription: task.task.description,
          deadline: task.deadline,
        })),
      };
    } catch (error) {
      throw new HttpException('Fehler beim Speichern der Daten', HttpStatus.BAD_REQUEST);
    }
  }


  /**
   * Removes a student from a course.
   * @param courseId - The ID of the course to remove the student from.
   * @param studentId - The ID of the student to remove from the course.
   * @returns A Promise that resolves to the deleted student's data in userDTO format, or null if an error occurred.
   */
  async removeStudentFromCourse(courseId: number, studentId: number): Promise<userDTO | null> {
    try {
      // find the course and its associated students
      const course = await this.prisma.course.findUnique({
        where: { id: courseId },
        include: { students: true },
      });

      if (!course) {
        throw new Error('Kurs nicht gefunden');
      }

      // check if the student is already in the course
      const studentToRemove = course.students.find(student => student.id === studentId);

      if (!studentToRemove) {
        throw new Error('Student nicht im Kurs gefunden');
      }

      // remove the student from the course
      const updatedCourse = await this.prisma.course.update({
        where: { id: courseId },
        data: {
          students: {
            disconnect: { id: studentId },
          },
        },
        include: { students: true },
      });

      const deletedStudent: userDTO = {
        id: studentToRemove.id,
        firstname: studentToRemove.firstname,
        lastname: studentToRemove.lastname,
      };

      return deletedStudent;
    } catch (error) {
      throw new HttpException('Fehler beim Löschen der Daten', HttpStatus.BAD_REQUEST);
    }
  }

  /**
   * Removes a task from a course.
   * @param courseId - The ID of the course to remove the task from.
   * @param taskId - The ID of the task to remove from the course.
   * @returns A Promise that resolves to the updated tasks for the course.
   */
  async removeTaskFromCourse(courseId: number, taskId: number): Promise<tasksInformationDTO> {
    try{
      // Delete the task from the course
      const deletedData = await this.prisma.tasksForCourse.deleteMany({
        where: {
          courseId: courseId,
          taskId: taskId,
        },
      });

      if (deletedData === null) {
        console.log('No data deleted');
      }

      // Return the tasks for the course to check if the task was deleted
      const returnedData = await this.prisma.tasksForCourse.findMany({
        where: {
          courseId: courseId,
        },
        select: {
          task: {
            select: {
              id: true,
              title: true,
              description: true,
            },
          },
          deadline: true,
        }
      });

      if (returnedData === null) {
        throw new Error('No data found');
      }

      return {
        tasksInformations: returnedData.map(task => ({
          taskId: task.task.id,
          taskTitle: task.task.title,
          taskDescription: task.task.description,
          deadline: task.deadline,
        })),
      };
    } catch (error) {
      throw new HttpException('Fehler beim Löschen der Daten', HttpStatus.BAD_REQUEST);
    }
  }



  /**
   * Adds a student to a course.
   *
   * @param courseId - The ID of the course.
   * @param studentId - The ID of the student.
   * @returns A Promise that resolves to a userDTO object representing the added student, or null if the student was not added.
   * @throws An error if the course is not found, the student is already in the course, or there is an error while adding the student to the course.
   */
  async addStudentToCourse(courseId: number, studentId: number): Promise<userDTO | null> {
    try {
      // Find the course and its associated students
      const course = await this.prisma.course.findUnique({
        where: { id: courseId },
        include: { students: true },
      });

      if (!course) {
        throw new Error('Kurs nicht gefunden');
      }

      // Check if the student is already in the course
      const studentToAdd = course.students.find(student => student.id === studentId);

      if (studentToAdd) {
        throw new Error('Student bereits im Kurs gefunden');
      }

      // Add the student to the course
      const updatedCourse = await this.prisma.course.update({
        where: { id: courseId },
        data: {
          students: {
            connect: { id: studentId },
          },
        },
        include: { students: true },
      });

      // Fetch the newly added student from the updated course data
      const addedStudent = updatedCourse.students.find(student => student.id === studentId);

      if (!addedStudent) {
        throw new Error('Fehler beim Abrufen des hinzugefügten Studenten');
      }

      // Convert the data of the added student to userDTO format
      const addedStudentDTO: userDTO = {
        id: addedStudent.id,
        firstname: addedStudent.firstname,
        lastname: addedStudent.lastname,
      };

      return addedStudentDTO;  // Returns the data of the added student
    } catch (error) {
      throw new HttpException('Fehler beim Speichern der Daten', HttpStatus.BAD_REQUEST);
    }
  }


  /**
   * Deletes a course and its related records from the database.
   *
   * @param courseId - The ID of the course to be deleted.
   * @returns A Promise that resolves to a courseDTO object containing information about the deleted course.
   */
  async deleteCourse(courseId: number): Promise<courseDTO> {
    try{
      // Delete related records first
      await this.prisma.taskAttempt.deleteMany({
        where: {
          courseId: courseId,
        },
      });

      await this.prisma.tasksForCourse.deleteMany({
        where: {
          courseId: courseId,
        },
      });

      // Now delete the course
      console.log('Deleting course with ID:', courseId);
      const course = await this.prisma.course.delete({
        where: {
          id: courseId,
        },
      });

      const lecturer = await this.prisma.user.findUnique({
        where: {
          id: course.lecturerId
        }
      });

      // Rest of the code...
      return {
        courseId: course.id,
        courseTitle: course.title,
        courseLecturer: `${lecturer.firstname} ${lecturer.lastname}`,
        courseDescription: course.description
      };
    } catch (error) {
      throw new HttpException('Fehler beim Löschen der Daten', HttpStatus.BAD_REQUEST);
    }
  }   

}
