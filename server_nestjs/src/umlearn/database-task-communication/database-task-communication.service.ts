import { taskAttemptDTO, taskCreationPopupDTO, taskDataDTO, taskInformationDTO, taskSettingsDTO, taskFeedbackDataDTO, taskFeedbackDTO, taskAttemptDataDTO, editorModelDTO, EditorModel, editorDataDTO, jaroWinklerDTO, studentTaskStatusDTO, tasksOverviewDTO, tasksInformationDTO, taskWorkspaceDataDTO } from '@DTOs/index';
import { PrismaService } from '@/prisma/prisma.service';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { getEnvironmentData } from 'worker_threads';
import { log } from 'console';
import { JaroWinklerDistance } from 'natural';
import * as natural from 'natural';
import { ClassNode } from '@Interfaces/index';
import { Prisma } from '@prisma/client';
import { CompareService } from '../compare/compare.service';
import { FeedbackGenerationService } from '@/ai/feedback-generation/feedback-generation.service';
import { FeedbackRAGService } from '@/ai/feedback-generation/feedback-rag.service';

@Injectable()
export class DatabaseTaskCommunicationService {

  constructor(
    private prisma: PrismaService,
    private compareService: CompareService,
    private feedbackGenerationService: FeedbackGenerationService,
    private feedbackRagService: FeedbackRAGService
  ) { }

/**
 * Finds synonyms for a given word and checks if a target word is a synonym.
 * If the target word is a synonym, it replaces it with the original word.
 * @param {string} string1 - The original word.
 * @param {string} string2 - The target word to check if it is a synonym.
 * @returns {Promise<{ newAttempt: string }>} - A promise that resolves to an object containing the new attempt word.
 */
  async synonym(string1: string, string2: string): Promise<{newAttempt:string}> {
    try{
      const natural = require('natural');
      const wordnet = new natural.WordNet();

      let resultList = [];
      await new Promise<void>((resolve, reject) => {
        wordnet.lookup(string1, function(results) {
            results.forEach(function(result) {
              resultList.push(...result.synonyms);
            });
            resolve();
        });
      });

      if (resultList.includes(string2)) {
        string2 = string1;
    }
      return {newAttempt:string2};
    } catch (error) {
      throw new HttpException('Fehler beim Laden der Daten', HttpStatus.BAD_REQUEST);
    }
  }

  /**
   * Retrieves the overview data of tasks for a specific user.
   *
   * @param userId - The ID of the user.
   * @returns A Promise that resolves to a tasksInformationDTO object containing the task information.
   */
  /* async getTasksOverviewData(userId: number): Promise<tasksInformationDTO> {
    try{
      const tasks = await this.prisma.task.findMany({
        where: {
          lecturerId: userId
        },
        select: {
          id: true,
          description: true,
          title: true,
        }
      });
      return {
        tasksInformations: tasks.map(task => ({
          taskId: task.id,
          deadline: null,
          taskDescription: task.description,
          taskTitle: task.title
        }))
      };
    } catch (error) {
      throw new HttpException('Fehler beim Laden der Daten', HttpStatus.BAD_REQUEST);
    }
  } */

  /**
   * Retrieves the overview of tasks for a given user.
   *
   * @param {number} userId - The ID of the user.
   * @returns {Promise<tasksOverviewDTO>} The tasks overview.
   */
  /* async getTasksOverview(userId: number): Promise<tasksOverviewDTO> {
    try{
      const tasks = await this.prisma.task.findMany({
        where: {
          lecturerId: userId
        },
        select: {
          id: true,
          description: true,
          title: true,
          maxPoints: true,
        }
      });
      return {
        tasksInformations: tasks.map(task => ({
          taskId: task.id,
          maxPoints: task.maxPoints,
          taskDescription: task.description,
          taskTitle: task.title
        }))
      };
    } catch (error) {
      throw new HttpException('Fehler beim Laden der Daten', HttpStatus.BAD_REQUEST);
    }
  } */



  /**
   * Creates a new task in the database.
   * @param {taskCreationPopupDTO} taskCreationData - The data for creating the task.
   * @returns {Promise<taskCreationPopupDTO>} - The created task data.
   */
  /* async createTask(taskCreationData: taskCreationPopupDTO): Promise<taskCreationPopupDTO> {
    try{
      // Create a new task in the database using Prisma.
      const returnedData = await this.prisma.task.create({
        data: {
          title: taskCreationData.taskTitle,
          description: taskCreationData.taskDescription,
          lecturer: {
            connect: { id: taskCreationData.lecturerId }
          },
          taskSettings: JSON.parse(JSON.stringify({
            editorModel: taskCreationData.selectedModel,
          })),
          maxPoints: 0,
        },
      });
      // Map and return the relevant course data.
      return {
        id: returnedData.id, // hier 4
        lecturerId: returnedData.lecturerId,
        taskTitle: returnedData.title,
        taskDescription: returnedData.description,
        selectedModel: typeof returnedData.editorData === 'object' && returnedData.editorData !== null ? (returnedData.editorData as any).model : undefined,
      }
    } catch (error) {
      throw new HttpException('Fehler beim Speichern der Daten', HttpStatus.BAD_REQUEST);
    }
  } */

  /**
   * Sets the task data in the database.
   * @param {taskDataDTO} taskData - The task data to be set.
   * @returns {Promise<taskDataDTO>} - The updated task data.
   */
  /* async setTaskData(taskData: taskDataDTO): Promise<taskDataDTO> {
    try{
      const data = await this.prisma.task.update({
        where: {
          id: taskData.id
        },
        data: {
          title: taskData.title,
          description: taskData.description,
          editorData: JSON.parse(JSON.stringify({...taskData.editorData})),
          taskSettings: JSON.parse(JSON.stringify({...taskData.taskSettings})),
          maxPoints: taskData.maxPoints,
          updatedAt: new Date()
        }
      });

      return {
        id: data.id,
        title: data.title,
        description: data.description,
        lecturerId: data.lecturerId,
        editorData: data.editorData as unknown as editorDataDTO,
        taskSettings: data.taskSettings as unknown as taskSettingsDTO,
        maxPoints: data.maxPoints,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt
      }
    } catch (error) {
      throw new HttpException('Fehler beim Speichern der Daten', HttpStatus.BAD_REQUEST);
    }
  } */

  /**
   * Sets the task image in the database.
   * @param taskId
   * @param image
   * @returns a Promise that resolves to the ID of the task.
   */
  /* async setTaskImage(taskId: number, imageB4: string): Promise<number> {
    try{
      const task = await this.prisma.task.update({
        where: {
          id: taskId
        },
        data: {
          dataImage: imageB4,
          updatedAt: new Date()
        }
      });
      if (!task) {
        throw new Error('Given Task id does not exist.');
      }
      return task.id;
    } catch (error) {
      throw new HttpException('Fehler beim Speichern der Daten', HttpStatus.BAD_REQUEST);
    }
  } */

  /**
   * Sets the task image in the database.
   * @param taskId
   * @returns a Promise that resolves to the ID of the task.
   */
  async getTaskImage(taskId: number): Promise<{imageB64: string}> {
    try{
      const task = await this.prisma.question.findUnique({
        where: {
          id: taskId
        },
        select: {
          UmlQuestion: {
            select: {
              dataImage: true
            }
          }
        }
      });
      if (!task) {
        throw new Error('Given Task id does not exist.');
      }
      return {imageB64: task.UmlQuestion.dataImage};
    } catch (error) {
      throw new HttpException('Fehler beim Speichern der Daten', HttpStatus.BAD_REQUEST);
    }
  }


  /**
   * Deletes a task and its associated data from the database.
   *
   * @param taskId - The ID of the task to be deleted.
   * @returns A promise that resolves to a taskInformationDTO object representing the deleted task.
   * @throws HttpException with status code 400 if there is an error while deleting the data.
   */
  /* async deleteTask(taskId: number): Promise<taskInformationDTO> {
    try{
      // Delete all TaskAttempts associated with the Task
      await this.prisma.taskAttempt.deleteMany({
        where: {
          taskId: taskId
        }
      });

      // Delete all TasksForCourse associated with the Task
      await this.prisma.tasksForCourse.deleteMany({
        where: {
          taskId: taskId
        }
      });

      // Then delete the Task
      const task = await this.prisma.task.delete({
        where: {
          id: taskId
        }
      });

      return {
          taskId: task.id,
          deadline: null,
          taskDescription: task.description,
          taskTitle: task.title
      };
    } catch (error) {
      throw new HttpException('Fehler beim Löschen der Daten', HttpStatus.BAD_REQUEST);
    }
  } */

  /**
     * Retrieves task data for a given task ID.
     * @param taskId - The ID of the task.
     * @returns A Promise that resolves to a taskDataDTO object containing the task data.
     */
  async getTaskData(taskId: number): Promise<taskDataDTO> {
    try{
      const question = await this.prisma.question.findUnique({
        where: {
          id: taskId
        },
        select: {
          authorId: true,
          name: true,
          //text: true,
          score: true,
          createdAt: true,
          updatedAt: true,
          UmlQuestion: {
            select: {
              editorData: true,
              startData: true,
              taskSettings: true,
              text: true,
              textHTML: true
            }
          }
        }
      });

      return {
        id: taskId,
        title: question.name,
        description: question.UmlQuestion.textHTML || question.UmlQuestion.text || '',
        lecturerId: question.authorId,
        editorData: question.UmlQuestion.editorData? question.UmlQuestion.editorData as unknown as editorDataDTO : {nodes: [], edges: []},
        taskSettings: question.UmlQuestion.taskSettings ? question.UmlQuestion.taskSettings as unknown as taskSettingsDTO : { allowedNodeTypes: [], allowedEdgeTypes: [], editorModel: EditorModel.CLASSDIAGRAM},
        maxPoints: question.score,
        createdAt: question.createdAt,
        updatedAt: question.updatedAt
      };
    } catch (error) {
      throw new HttpException('Fehler beim Laden der Daten', HttpStatus.BAD_REQUEST);
    }
  }

  /**
   * Retrieves the workspace data for a specific task.
   * @param taskId - The ID of the task.
   * @returns A Promise that resolves to a taskWorkspaceDataDTO object containing the task's workspace data.
   * @throws HttpException with status code 400 if there is an error while loading the data.
   */
  async getTaskWorkspaceData(taskId: number): Promise<taskWorkspaceDataDTO> {
    try{
      const task = await this.prisma.question.findUnique({
        where: {
          id: taskId
        },
        select: {
          name: true,
          //text: true,
          UmlQuestion: {
            select: {
              taskSettings: true,
              text: true,
              textHTML: true
            }
          },
          score: true,
        }
      });

      return {
        id: taskId,
        title: task.name,
        description: task.UmlQuestion.textHTML || task.UmlQuestion.text || '',
        taskSettings: task.UmlQuestion.taskSettings ? task.UmlQuestion.taskSettings as unknown as taskSettingsDTO : { allowedNodeTypes: [], allowedEdgeTypes: [], editorModel: EditorModel.CLASSDIAGRAM},
        maxPoints: task.score,
      };
    } catch (error) {
      throw new HttpException('Fehler beim Laden der Daten', HttpStatus.BAD_REQUEST);
    }
  }

  /**
   * Retrieves task feedback data for a given task attempt ID.
   * @param {number} taskAttemptId - The ID of the task attempt.
   * @returns {Promise<taskFeedbackDataDTO>} - The task feedback data.
   */
  /* async getTaskFeedbackData(taskAttemptId: number): Promise<taskFeedbackDataDTO> {
    try{
      const taskFeedback = await this.prisma.feedback.findUnique({
        where: {
          id: taskAttemptId
        },
        select: {
          id: true,
          lecturerId: true,
          taskAttemptId: true,
          reachedPoints: true,
          feedbackText: true,
          createdAt: true,
          updatedAt: true,
        }
      });
      const attempt = await this.prisma.taskAttempt.findUnique({
        where: {
          id: taskAttemptId
        },
        select: {
          id: true,
          studentId: true,
          taskId: true,
          courseId: true,
          attemptData: true,
        }
      });
      const task = await this.prisma.task.findUnique({
        where: {
          id: attempt.taskId
        },
        select: {
          id: true,
          title: true,
          description: true,
          lecturerId: true,
          editorData: true,
          taskSettings: true,
          maxPoints: true,
          createdAt: true,
          updatedAt: true,
        }
      });
      const taskInfo = await this.prisma.tasksForCourse.findUnique({
        where: {
          id: attempt.taskId
        },
        select: {
          deadline: true,
        }
      });
      return {
        feedback: {
          feedbackId: taskFeedback? taskFeedback.id : -1,
          lecturerId: taskFeedback? taskFeedback.lecturerId : -1,
          taskAttemptId: taskAttemptId,
          reachedPoints: taskFeedback? taskFeedback.reachedPoints : 0,
          feedbackText: taskFeedback? taskFeedback.feedbackText : '',
          createdAt: taskFeedback? taskFeedback.createdAt : new Date(),
          updatedAt: taskFeedback? taskFeedback.updatedAt : new Date(),
        },
        task: {
          id: task.id,
          title: task.title,
          description: task.description,
          lecturerId: task.lecturerId,
          editorData: task.editorData? task.editorData as unknown as editorDataDTO : {nodes: [], edges: []},
          taskSettings: task.taskSettings ? task.taskSettings as unknown as taskSettingsDTO : { allowedNodeTypes: [], allowedEdgeTypes: [], editorModel: EditorModel.CLASSDIAGRAM},
          maxPoints: task.maxPoints,
          createdAt: task.createdAt,
          updatedAt: task.updatedAt
        },
        attempt: {
          id: attempt.id,
          taskId: attempt.taskId,
          courseId: attempt.courseId,
          studentId: attempt.studentId,
          attemptData: attempt.attemptData ? attempt.attemptData as unknown as editorDataDTO : {nodes: [], edges: []},
        },
      };
    } catch (error) {
      throw new HttpException('Fehler beim Laden der Daten', HttpStatus.BAD_REQUEST);
    }
  } */


  /**
   * Retrieves task feedback data for a specific student.
   * @param courseId - The ID of the course.
   * @param taskId - The ID of the task.
   * @param studentId - The ID of the student.
   * @param globalRole - The global role of the user.
   * @returns A promise that resolves to a taskFeedbackDataDTO object containing the feedback, task, and attempt information.
   * @throws HttpException if there is an error while loading the data.
   */
  /* async getTaskFeedbackDataByStudent(courseId: number, taskId: number, studentId: number, globalRole: string): Promise<taskFeedbackDataDTO> {
    try{
      let taskAttempt = await this.prisma.taskAttempt.findFirst({
        where: {
          courseId: courseId,
          taskId: taskId,
          studentId: studentId
        },
        select: {
          id: true,
          studentId: true,
          taskId: true,
          courseId: true,
          attemptData: true,
        }
      });
      if (!taskAttempt) {
        taskAttempt = await this.prisma.taskAttempt.create({
          data: {
            courseId: courseId,
            taskId: taskId,
            studentId: studentId,
            attemptData: {nodes: [], edges: []}, // Empty attemptData
          },
          select: {
            id: true,
            studentId: true,
            taskId: true,
            courseId: true,
            attemptData: true,
          }
        });
      }
      const taskFeedback = await this.prisma.feedback.findFirst({
        where: {
          taskAttemptId: taskAttempt.id
        },
        select: {
          id: true,
          lecturerId: true,
          taskAttemptId: true,
          reachedPoints: true,
          feedbackText: true,
          createdAt: true,
          updatedAt: true,
        }
      });
      const task = await this.prisma.task.findUnique({
        where: {
          id: taskAttempt.taskId
        },
        select: {
          id: true,
          title: true,
          description: true,
          lecturerId: true,
          editorData: true,
          taskSettings: true,
          maxPoints: true,
          createdAt: true,
          updatedAt: true,
        }
      });
      const taskInfo = await this.prisma.tasksForCourse.findUnique({
        where: {
          id: taskAttempt.taskId
        },
        select: {
          deadline: true,
        }
      });

      return {
        feedback: {
          feedbackId: taskFeedback? taskFeedback.id : -1,
          lecturerId: taskFeedback? taskFeedback.lecturerId : -1,
          taskAttemptId: taskAttempt.id,
          reachedPoints: taskFeedback? taskFeedback.reachedPoints : 0,
          feedbackText: taskFeedback? taskFeedback.feedbackText : '',
          createdAt: taskFeedback? taskFeedback.createdAt : new Date(),
          updatedAt: taskFeedback? taskFeedback.updatedAt : new Date(),
        },
        task: {
          id: task.id,
          title: task.title,
          description: task.description,
          lecturerId: task.lecturerId,
          editorData: (globalRole === 'LECTURER') ? (task.editorData ? task.editorData as unknown as editorDataDTO : {nodes: [], edges: []}) : {nodes: [], edges: []},
          taskSettings: task.taskSettings ? task.taskSettings as unknown as taskSettingsDTO : { allowedNodeTypes: [], allowedEdgeTypes: [], editorModel: EditorModel.CLASSDIAGRAM},
          maxPoints: task.maxPoints,
          createdAt: task.createdAt,
          updatedAt: task.updatedAt
        },
        attempt: {
          id: taskAttempt.id,
          taskId: taskAttempt.taskId,
          courseId: taskAttempt.courseId,
          studentId: taskAttempt.studentId,
          attemptData: taskAttempt.attemptData ? taskAttempt.attemptData as unknown as editorDataDTO : {nodes: [], edges: []},
        },
      };
    } catch (error) {
      throw new HttpException('Fehler beim Laden der Daten', HttpStatus.BAD_REQUEST);
    }
  } */

  /**
   * Retrieves task feedback data for a given course.
   * @param {number} courseId - The ID of the course.
   * @returns {Promise<taskFeedbackDataDTO[]>} - A promise that resolves to an array of task feedback data objects.
   */
  /* async getTaskFeedbackDataByCourse(courseId: number): Promise<taskFeedbackDataDTO[]> {
    try{
      const taskAttempts = await this.prisma.taskAttempt.findMany({
        where: {
          courseId: courseId
        },
        select: {
          id: true,
          studentId: true,
          taskId: true,
          courseId: true,
          attemptData: true,
        }
      });
      const taskFeedbacks = await this.prisma.feedback.findMany({
        where: {
          taskAttemptId: {
            in: taskAttempts.map(taskAttempt => taskAttempt.id)
          }
        },
        select: {
          id: true,
          lecturerId: true,
          taskAttemptId: true,
          reachedPoints: true,
          feedbackText: true,
          createdAt: true,
          updatedAt: true,
        }
      });
      const tasks = await this.prisma.task.findMany({
        where: {
          id: {
            in: taskAttempts.map(taskAttempt => taskAttempt.taskId)
          }
        },
        select: {
          id: true,
          title: true,
          description: true,
          lecturerId: true,
          editorData: true,
          taskSettings: true,
          maxPoints: true,
          createdAt: true,
          updatedAt: true,
        }
      });
      const taskInfos = await this.prisma.tasksForCourse.findMany({
        where: {
          id: {
            in: taskAttempts.map(taskAttempt => taskAttempt.taskId)
          }
        },
        select: {
          deadline: true,
        }
      });
      return taskAttempts.map(taskAttempt => {
        const taskFeedback = taskFeedbacks.find(taskFeedback => taskFeedback.taskAttemptId === taskAttempt.id);
        const task = tasks.find(task => task.id === taskAttempt.taskId);
        return {
          feedback: {
            feedbackId: taskFeedback? taskFeedback.id : -1,
            lecturerId: taskFeedback? taskFeedback.lecturerId : -1,
            taskAttemptId: taskAttempt.id,
            reachedPoints: taskFeedback? taskFeedback.reachedPoints : 0,
            feedbackText: taskFeedback? taskFeedback.feedbackText : '',
            createdAt: taskFeedback? taskFeedback.createdAt : new Date(),
            updatedAt: taskFeedback? taskFeedback.updatedAt : new Date(),
          },
          task: {
            id: task.id,
            title: task.title,
            description: task.description,
            lecturerId: task.lecturerId,
            editorData: task.editorData? task.editorData as unknown as editorDataDTO : {nodes: [], edges: []},
            taskSettings: task.taskSettings ? task.taskSettings as unknown as taskSettingsDTO : { allowedNodeTypes: [], allowedEdgeTypes: [], editorModel: EditorModel.CLASSDIAGRAM},
            maxPoints: task.maxPoints,
            createdAt: task.createdAt,
            updatedAt: task.updatedAt
          },
          attempt: {
            id: taskAttempt.id,
            taskId: taskAttempt.taskId,
            courseId: taskAttempt.courseId,
            studentId: taskAttempt.studentId,
            attemptData: taskAttempt.attemptData ? taskAttempt.attemptData as unknown as editorDataDTO : {nodes: [], edges: []},
          },
        };
      });
    } catch (error) {
      throw new HttpException('Fehler beim Laden der Daten', HttpStatus.BAD_REQUEST);
    }
  } */

  /**
   * Retrieves the task attempt data for a specific task and student.
   * @param taskId - The ID of the task.
   * @param studentId - The ID of the student.
   * @returns A Promise that resolves to a taskAttemptDataDTO object containing the task attempt data.
   */
  async getTaskAttemptData(taskId: number, studentId: number): Promise<taskAttemptDataDTO> {
    try{
      const taskAttempt = await this.prisma.question.findFirst({
        where: {
          id: taskId,
          userAnswer: {
            some: {
              userId: studentId,
            },
          },
        },
        select: {
          userAnswer: {
            take: 1,
            orderBy: {
              createdAt: 'desc',
            },
            select: {
              id: true,
              UserUmlQuestionAnswer: {
                select: {
                  attemptData: true,
                }
              }
            }
          }
        },
      });

      if (!taskAttempt) {
        // Return dummy data
        return {
          userAnswerId: -1,
          taskId: taskId,
          attemptData: { nodes: [], edges: [] },
        };
      }
      console.log("taskAttempt: ", taskAttempt);

      return {
        userAnswerId: taskAttempt.userAnswer[0].id,
        taskId: taskId,
        attemptData: taskAttempt.userAnswer[0].UserUmlQuestionAnswer.attemptData as unknown as editorDataDTO,
        //attemptData: taskAttempt.userAnswer[0].UserUmlQuestionAnswer ? (taskAttempt.userAnswer[0].UserUmlQuestionAnswer as unknown as editorDataDTO) : { nodes: [], edges: [] },
      };
    } catch (error) {
      throw new HttpException('Fehler beim Laden der Daten', error);
    }
  }

/**
 * Retrieves task attempt data for a lecturer.
 * @param taskAttemptId - The ID of the task attempt.
 * @returns A Promise that resolves to a taskAttemptDataDTO object.
 */
/* async getTaskAttemptDataForLecturer(taskAttemptId: number): Promise<taskAttemptDataDTO> {
    try{
      const taskAttempt = await this.prisma.taskAttempt.findUnique({
        where: {
          id: taskAttemptId
        },
        select: {
          id: true,
          studentId: true,
          taskId: true,
          courseId: true,
          attemptData: true,
        }
      });

      if (!taskAttempt) {
        // Return dummy data
        return {
          id: -1,
          studentId: -1,
          taskId: -1,
          courseId: -1,
          attemptData: { nodes: [], edges: [] },
        };
      }

      return {
        id: taskAttempt.id,
        studentId: taskAttempt.studentId,
        taskId: taskAttempt.taskId,
        courseId: taskAttempt.courseId,
        attemptData: taskAttempt.attemptData ? (taskAttempt.attemptData as unknown as editorDataDTO) : { nodes: [], edges: [] },
      };
    } catch (error) {
      throw new HttpException('Fehler beim Laden der Daten', HttpStatus.BAD_REQUEST);
    }
  } */

  /**
   * Retrieves the points earned by a student for a task attempt and saves the attempt data.
   * @param taskAttemptData - The data of the task attempt.
   * @param studentId - The ID of the student.
   * @returns A Promise that resolves to the number of points earned.
   * @throws An error if the attempt data fails to save or if the related question cannot be found.
   */
  async commitAttemptGetPoints(taskAttemptData: taskAttemptDataDTO, studentId: number): Promise<{points: number, highlightData: editorDataDTO}> {
    const savedAttempt = await this.setTaskAttemptData(taskAttemptData, studentId);
    if (!savedAttempt){
      throw new Error('Failed to save UML attempt');
    }

    //feedback exists for savedAttempt?
    if (taskAttemptData.userAnswerId != -1){
      const existingFeedback = await this.prisma.userAnswer.findFirst({
        where: {
          id: savedAttempt.userAnswerId,
        },
        select: {
          feedbacks: true,
        }
      });
      if (existingFeedback && existingFeedback.feedbacks[0]){
        console.log("feedback existing");
        //return existingFeedback.feedbacks[0].score;
        return {
          points: existingFeedback.feedbacks[0].score,
          highlightData: savedAttempt.attemptData,
        };
      }
    }


    //get task solution
    const taskSolution = await this.prisma.question.findFirst({
      where: {
        id: savedAttempt.taskId,
      },
      select: {
        score: true,
        UmlQuestion: {
          select: {
            editorData: true,
          }
        }
      }
    });

    //console.log("found solution: ", taskSolution);

    if (!taskSolution){
      throw new Error('Failed to find related question');
    }

    const reachedPoints = await this.compareService.compareAndCalculate(taskSolution.UmlQuestion.editorData as undefined as editorDataDTO, taskAttemptData.attemptData, taskSolution.score);

    //save feedback
    const feedback = await this.prisma.feedback.create({
      data: {
        userAnswerId: savedAttempt.userAnswerId,
        score: reachedPoints.points,
        text: '',
      }
    });

    if (!feedback){
      throw new Error('Failed to save feedback');
    }

    console.log('calculated: ', reachedPoints);
    return reachedPoints;
  }

  async generateUmlFeedback(taskId: number, studentId: number): Promise<{response: string}> {
    //get the task solution and the student's attempt
    const taskSolution = await this.prisma.question.findFirst({
      where: {
        id: taskId,
      },
      select: {
        score: true,
        UmlQuestion: {
          select: {
            text: true,
            editorData: true,
          }
        }
      }
    });

    //find the student's attempt
    const studentAttempt = await this.getTaskAttemptData(taskId, studentId);

    //return this.feedbackGenerationService.generateUMLearnFeedback(taskSolution.UmlQuestion.text, studentAttempt.attemptData, taskSolution.UmlQuestion.editorData as unknown as editorDataDTO);
    return this.feedbackRagService.generateUmlFeedback(taskSolution.UmlQuestion.text, studentAttempt.attemptData, taskSolution.UmlQuestion.editorData as unknown as editorDataDTO);
  }

  /**
   * Sets the task attempt data in the database, creating a new task attempt if necessary.
   * If the task attempt data is different from the task attempt, a new task attempt is created.
   * @param taskAttemptData - The task attempt data to be set or updated.
   * @returns A Promise that resolves to the updated or newly created task attempt data.
   */
  async setTaskAttemptData(taskAttemptData: taskAttemptDataDTO, studentId: number): Promise<taskAttemptDataDTO> {
    try{
      const taskAttempt = await this.prisma.question.findFirst({
        where: {
          id: taskAttemptData.taskId,
          userAnswer: {
            some: {
              userId: studentId,
            },
          },
        },
        select: {
          userAnswer: {
            take: 1,
            orderBy: {
              createdAt: 'desc',
            },
            select: {
              id: true,
              UserUmlQuestionAnswer: {
                select: {
                  attemptData: true,
                }
              }
            }
          }
        },
      });

      if (!taskAttempt || (taskAttempt && this.isDifferentAttemptData(taskAttempt.userAnswer[0].UserUmlQuestionAnswer.attemptData, taskAttemptData.attemptData))) {
        //create a new userAnswer and a new UserUmlQuestionAnswer and connect them
        console.log("not the same",'inDB: ', this.sortObject(JSON.parse(JSON.stringify(taskAttempt.userAnswer[0].UserUmlQuestionAnswer.attemptData))), 'new: ', this.sortObject(JSON.parse(JSON.stringify(taskAttemptData.attemptData))), 'isDifferent: ', this.isDifferentAttemptData(taskAttempt.userAnswer[0].UserUmlQuestionAnswer.attemptData, taskAttemptData.attemptData));
        const newAnswer = await this.prisma.userAnswer.create({
          data: {
            userId: studentId,
            questionId: taskAttemptData.taskId,
            UserUmlQuestionAnswer: {
              create: {
                attemptData: JSON.parse(JSON.stringify({...taskAttemptData.attemptData})),
              }
            }
          },
          select: {
            id: true,
            UserUmlQuestionAnswer: {
              select: {
                attemptData: true,
              }
            }
          }
        });
        console.log("ATTEMPT JSON: ", JSON.stringify(taskAttemptData.attemptData));
        return {
          userAnswerId: newAnswer.id,
          taskId: taskAttemptData.taskId,
          attemptData: newAnswer.UserUmlQuestionAnswer.attemptData as unknown as editorDataDTO,
        };
      }
      console.log("the same");
      console.log("ATTEMPT JSON: ", JSON.stringify(taskAttemptData.attemptData));
      return {
        userAnswerId: taskAttempt.userAnswer[0].id,
        taskId: taskAttemptData.taskId,
        attemptData: taskAttemptData.attemptData,
      };
    } catch (error) {
      throw new HttpException('Fehler beim Speichern der Daten', error);
    }
  }

  /**
   * Checks if the task attempt data is different from the task attempt.
   * @param {Prisma.JsonValue} taskAttempt - The task attempt data stored in the database.
   * @param {editorDataDTO} taskAttemptData - The task attempt data received from the client.
   * @returns {boolean} - Returns true if the task attempt data is different, otherwise false.
   */
  private isDifferentAttemptData(taskAttempt: Prisma.JsonValue, taskAttemptData: editorDataDTO): boolean {
    const sortedTaskAttempt = this.sortAndStringify(taskAttempt);
    const sortedTaskAttemptData = this.sortAndStringify(taskAttemptData);
    console.log('sortedTaskAttempt: ', sortedTaskAttempt, 'sortedTaskAttemptData: ', sortedTaskAttemptData);
    return sortedTaskAttempt != sortedTaskAttemptData;
  }

  /**
   * Sorts and stringifies the given data.
   *
   * @param data - The data to be sorted and stringified.
   * @returns The sorted and stringified data.
   */
  private sortAndStringify(data: any): string {
    const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
    const sortedData = this.sortObject(parsedData);
    return JSON.stringify(sortedData);
  }

  /**
   * Sorts the properties of an object recursively.
   *
   * @param obj - The object to be sorted.
   * @returns The sorted object.
   */
  private sortObject(obj: any): any {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }
    if (Array.isArray(obj)) {
      return obj.map(this.sortObject.bind(this));
    }
    return Object.keys(obj).sort().reduce((result: { [key: string]: any }, key: string) => {
      result[key] = this.sortObject(obj[key]);
      return result;
    }, {});
  }



  /**
   * Creates a new feedback for a task attempt.
   *
   * @param {taskFeedbackDTO} taskFeedbackData - The data for the task feedback.
   * @param {number} lecturerId - The ID of the lecturer.
   * @returns {Promise<taskFeedbackDTO>} - The created task feedback.
   * @throws {Error} - If the given task attempt or feedback ID does not exist.
   */
  /* async createFeedback(taskFeedbackData: taskFeedbackDTO, lecturerId: number): Promise<taskFeedbackDTO> {
    try{
      const taskAttempt = await this.prisma.taskAttempt.findFirst({
        where: {
          id: taskFeedbackData.taskAttemptId
        }
      });

      if (!taskAttempt) {
        throw new Error('Given Task Attempt does not exist.');
      }

      if (taskFeedbackData.feedbackId == -1) {
        const newFeedbackData = await this.prisma.feedback.create({
          data: {
            reachedPoints: taskFeedbackData.reachedPoints,
            feedbackText: taskFeedbackData.feedbackText,
            taskAttempt: {
              connect: { id: taskFeedbackData.taskAttemptId }
            },
            lecturer: {
              connect: { id: lecturerId }
            },
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });

        return {
          feedbackId: newFeedbackData.id,
          lecturerId: newFeedbackData.lecturerId,
          taskAttemptId: newFeedbackData.taskAttemptId,
          reachedPoints: newFeedbackData.reachedPoints,
          feedbackText: newFeedbackData.feedbackText,
          createdAt: newFeedbackData.createdAt,
          updatedAt: newFeedbackData.updatedAt
        };
      } else {
        const existingFeedback = await this.prisma.feedback.findFirst({
          where: {
            taskAttemptId: taskFeedbackData.taskAttemptId
          },
        });

        if (!existingFeedback) {
          throw new Error('Given Feedback id does not exist.');
        }

        const updatedFeedback = await this.prisma.feedback.update({
          where: {
            id: taskFeedbackData.feedbackId
          },
          data: {
            reachedPoints: taskFeedbackData.reachedPoints,
            feedbackText: taskFeedbackData.feedbackText,
            updatedAt: new Date()
          }
        });

        return {
          feedbackId: updatedFeedback.id,
          lecturerId: updatedFeedback.lecturerId,
          taskAttemptId: updatedFeedback.taskAttemptId,
          reachedPoints: updatedFeedback.reachedPoints,
          feedbackText: updatedFeedback.feedbackText,
          createdAt: updatedFeedback.createdAt,
          updatedAt: updatedFeedback.updatedAt
        };
      }
    } catch (error) {
      throw new HttpException('Fehler beim Speichern der Daten', HttpStatus.BAD_REQUEST);
    }
  } */

  /**
   * Retrieves the task status for a specific student in a course.
   *
   * @param {number} courseId - The ID of the course.
   * @param {number} taskId - The ID of the task.
   * @returns {Promise<studentTaskStatusDTO[]>} - A promise that resolves to an array of student task status objects.
   */
  /* async getStudentTaskStatus(courseId: number, taskId: number): Promise<studentTaskStatusDTO[]> {
    try{
      const taskAttempts = await this.prisma.taskAttempt.findMany({
        where: {
          courseId: courseId,
          taskId: taskId
        }
      });
      const students = await this.prisma.user.findMany({
        where: {
          id: {
            in: taskAttempts.map(taskAttempt => taskAttempt.studentId)
          }
        }
      });
      const taskFeedbacks = await this.prisma.feedback.findMany({
        where: {
          taskAttemptId: {
            in: taskAttempts.map(taskAttempt => taskAttempt.id)
          }
        }
      });
      return students.map(student => {
        const taskAttempt = taskAttempts.find(taskAttempt => taskAttempt.studentId === student.id);
        const taskFeedback = taskFeedbacks.find(taskFeedback => taskFeedback.taskAttemptId === taskAttempt.id);
        return {
          student: {
            id: student.id,
            firstname: student.firstname,
            lastname: student.lastname,
          },
          hasAttempt: !!taskAttempt,
          hasFeedback: !!taskFeedback,
        };
      });
    } catch (error) {
      throw new HttpException('Fehler beim Laden der Daten', HttpStatus.BAD_REQUEST);
    }
  } */


  /**
   * Checks if there are any task attempts for a given task ID.
   *
   * @param taskId - The ID of the task to check for attempts.
   * @returns A Promise that resolves to a boolean indicating if there are any task attempts.
   * @throws HttpException with a status code of BAD_REQUEST if there is an error loading the data.
   */
  /* async checkForTaskAttempts(taskId: number): Promise<boolean> {
    try{
      const taskAttempt = await this.prisma.taskAttempt.findFirst({
        where: {
          taskId: taskId
        }
      });
      return !!taskAttempt;
    } catch (error) {
      throw new HttpException('Fehler beim Laden der Daten', HttpStatus.BAD_REQUEST);
    }
  } */

  /**
   * Checks if there are any task attempts for a given course and task.
   * @param courseId - The ID of the course.
   * @param taskId - The ID of the task.
   * @returns A Promise that resolves to a boolean indicating whether there are any task attempts or not.
   * @throws HttpException with a message 'Fehler beim Laden der Daten' and HttpStatus.BAD_REQUEST if an error occurs while loading the data.
   */
  /* async checkForTaskAttemptsForCourse(courseId: number, taskId: number): Promise<boolean> {
    try{
      const taskAttempt = await this.prisma.taskAttempt.findFirst({
        where: {
          courseId: courseId,
          taskId: taskId
        }
      });
      return !!taskAttempt;
    } catch (error) {
      throw new HttpException('Fehler beim Laden der Daten', HttpStatus.BAD_REQUEST);
    }
  } */

  /**
   * Checks if there are any task attempts for a given course and student.
   *
   * @param courseId - The ID of the course.
   * @param studentId - The ID of the student.
   * @returns A Promise that resolves to a boolean indicating whether there are any task attempts.
   * @throws HttpException if there is an error while loading the data.
   */
  /* async checkForTaskAttemptsForCourseAndStudent(courseId: number, studentId: number): Promise<boolean> {
    try{
      const taskAttempt = await this.prisma.taskAttempt.findFirst({
        where: {
          courseId: courseId,
          studentId: studentId
        }
      });
      return !!taskAttempt;
    } catch (error) {
      throw new HttpException('Fehler beim Laden der Daten', HttpStatus.BAD_REQUEST);
    }
  } */

}
