import type {
  taskDataDTO,
  taskSettingsDTO,
  taskAttemptDataDTO,
  editorDataDTO,
  taskWorkspaceDataDTO,
} from '@DTOs/index';
import { EditorModel } from '@DTOs/index';
import { PrismaService } from '@/prisma/prisma.service';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { CompareService } from '../compare/compare.service';
import { FeedbackGenerationService } from '@/ai/feedback-generation/feedback-generation.service';
import { FeedbackRAGService } from '@/ai/feedback-generation/feedback-rag.service';
import { SimilarityCompareService } from '../compare/similarity-compare.service';

@Injectable()
export class DatabaseTaskCommunicationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly compareService: CompareService,
    private readonly similarityCompareService: SimilarityCompareService,
    private readonly feedbackGenerationService: FeedbackGenerationService,
    private readonly feedbackRagService: FeedbackRAGService,
  ) {}

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
  async getTaskImage(taskId: number): Promise<{ imageB64: string }> {
    try {
      const task = await this.prisma.question.findUnique({
        where: {
          id: taskId,
        },
        select: {
          UmlQuestion: {
            select: {
              dataImage: true,
            },
          },
        },
      });
      if (!task) {
        throw new Error('Given Task id does not exist.');
      }
      return { imageB64: task.UmlQuestion.dataImage };
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
    try {
      const question = await this.prisma.question.findUnique({
        where: {
          id: taskId,
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
              textHTML: true,
            },
          },
        },
      });

      return {
        id: taskId,
        title: question.name,
        description: question.UmlQuestion.textHTML || question.UmlQuestion.text || '',
        lecturerId: question.authorId,
        editorData: question.UmlQuestion.editorData
          ? (question.UmlQuestion.editorData as unknown as editorDataDTO)
          : { nodes: [], edges: [] },
        taskSettings: question.UmlQuestion.taskSettings
          ? (question.UmlQuestion.taskSettings as unknown as taskSettingsDTO)
          : {
              allowedNodeTypes: [],
              allowedEdgeTypes: [],
              editorModel: EditorModel.CLASSDIAGRAM,
            },
        maxPoints: question.score,
        createdAt: question.createdAt,
        updatedAt: question.updatedAt,
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
    try {
      const task = await this.prisma.question.findUnique({
        where: {
          id: taskId,
        },
        select: {
          name: true,
          //text: true,
          UmlQuestion: {
            select: {
              taskSettings: true,
              text: true,
              textHTML: true,
            },
          },
          score: true,
        },
      });

      return {
        id: taskId,
        title: task.name,
        description: task.UmlQuestion.textHTML || task.UmlQuestion.text || '',
        taskSettings: task.UmlQuestion.taskSettings
          ? (task.UmlQuestion.taskSettings as unknown as taskSettingsDTO)
          : {
              allowedNodeTypes: [],
              allowedEdgeTypes: [],
              editorModel: EditorModel.CLASSDIAGRAM,
            },
        maxPoints: task.score,
      };
    } catch (error) {
      throw new HttpException('Fehler beim Laden der Daten', HttpStatus.BAD_REQUEST);
    }
  }

  /**
   * Retrieves the task attempt data for a specific task and student.
   * @param taskId - The ID of the task.
   * @param studentId - The ID of the student.
   * @returns A Promise that resolves to a taskAttemptDataDTO object containing the task attempt data.
   */
  async getTaskAttemptData(taskId: number, studentId: number): Promise<taskAttemptDataDTO> {
    try {
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
                },
              },
            },
          },
        },
      });

      if (!taskAttempt) {
        // Return dummy data if no task start data is available
        const task = await this.prisma.question.findUnique({
          where: {
            id: taskId,
          },
          select: {
            UmlQuestion: {
              select: {
                startData: true,
              },
            },
          },
        });

        return {
          userAnswerId: -1,
          taskId: taskId,
          attemptData: task
            ? (task.UmlQuestion.startData as unknown as editorDataDTO)
            : { nodes: [], edges: [] },
        };
      }

      return {
        userAnswerId: taskAttempt.userAnswer[0].id,
        taskId: taskId,
        attemptData: taskAttempt.userAnswer[0].UserUmlQuestionAnswer
          .attemptData as unknown as editorDataDTO,
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
  async commitAttemptGetPoints(
    taskAttemptData: taskAttemptDataDTO,
    studentId: number,
  ): Promise<{ points: number }> {
    const savedAttempt = await this.setTaskAttemptData(taskAttemptData, studentId);
    if (!savedAttempt) {
      throw new Error('Failed to save UML attempt');
    }

    //feedback exists for savedAttempt?
    if (taskAttemptData.userAnswerId != -1) {
      const existingFeedback = await this.prisma.userAnswer.findFirst({
        where: {
          id: savedAttempt.userAnswerId,
        },
        select: {
          feedbacks: true,
        },
      });
      if (existingFeedback && existingFeedback.feedbacks[0]) {
        console.log('feedback existing');
        //return existingFeedback.feedbacks[0].score;
        return {
          points: existingFeedback.feedbacks[0].score,
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
          },
        },
      },
    });

    if (!taskSolution) {
      throw new Error('Failed to find related question');
    }

    //const reachedPoints = await this.compareService.compareAndCalculate(taskSolution.UmlQuestion.editorData as undefined as editorDataDTO, taskAttemptData.attemptData, taskSolution.score);
    const reachedPoints = Math.floor(
      taskSolution.score *
        this.similarityCompareService.calcGraphSimilarity(
          taskAttemptData.attemptData,
          taskSolution.UmlQuestion.editorData as unknown as editorDataDTO,
        ),
    );

    // upsert content element as done if points are reached
    if (reachedPoints === taskSolution.score) {
      const contentElementId = await this.getContentElementId(taskAttemptData.taskId);

      const currprogress = await this.prisma.userContentElementProgress.findFirst({
        where: {
          userId: studentId,
          contentElementId: contentElementId,
        },
      });
      if (currprogress) {
        await this.prisma.userContentElementProgress.update({
          where: {
            id: currprogress.id,
          },
          data: {
            markedAsDone: true,
          },
        });
      } else {
        await this.prisma.userContentElementProgress.create({
          data: {
            userId: studentId,
            contentElementId: contentElementId,
            markedAsDone: true,
          },
        });
      }
    }

    //save feedback
    const feedback = await this.prisma.feedback.create({
      data: {
        //userAnswerId: savedAttempt.userAnswerId,
        userAnswer: {
          connect: {
            id: savedAttempt.userAnswerId,
          },
        },
        score: reachedPoints,
        text: 'You reached ' + reachedPoints + ' out of ' + taskSolution.score + ' points.',
      },
    });

    if (!feedback) {
      throw new Error('Failed to save feedback');
    }

    console.log('calculated: ', reachedPoints);
    return { points: reachedPoints };
  }

  /**
   * Retrieves the ID of the content element associated with a given task.
   *
   * @param taskId - The unique identifier of the task for which the content element ID is to be retrieved.
   * @returns A promise that resolves to the ID of the associated content element.
   * @throws An error if no question is found for the given task ID.
   */
  async getContentElementId(taskId: number): Promise<number> {
    const contentElement = await this.prisma.question.findUnique({
      where: {
        id: taskId,
      },
      select: {
        contentElement: true,
      },
    });
    if (!contentElement) {
      throw new Error('Failed to find related question');
    }
    return contentElement.contentElement.id;
  }

  async generateUmlFeedback(taskId: number, studentId: number): Promise<{ response: string }> {
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
          },
        },
      },
    });

    //find the student's attempt
    const studentAttempt = await this.getTaskAttemptData(taskId, studentId);

    const matchingLog = this.similarityCompareService.compare(
      studentAttempt.attemptData,
      taskSolution.UmlQuestion.editorData as unknown as editorDataDTO,
    );
    const response = await this.feedbackRagService.generateUmlFeedbackByLog(
      taskSolution.UmlQuestion.text,
      matchingLog,
    );
    return { response: response.response }; //+ '\n\n\n###DEBUG MATCHING-LOG###\n\n' + matchingLog};
    //return this.feedbackRagService.generateUmlFeedbackByLog(taskSolution.UmlQuestion.text, matchingLog);
    //return this.feedbackRagService.generateUmlFeedback(taskSolution.UmlQuestion.text, studentAttempt.attemptData, taskSolution.UmlQuestion.editorData as unknown as editorDataDTO);
    //return { response: this.similarityCompareService.findAndGenerateGraphSimilarityLog(studentAttempt.attemptData, taskSolution.UmlQuestion.editorData as unknown as editorDataDTO) };
  }

  async generateUmlFeedbackByHighlighted(
    taskId: number,
    studentId: number,
  ): Promise<{ response: string }> {
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
          },
        },
      },
    });

    //find the student's attempt
    const studentAttempt = await this.getTaskAttemptData(taskId, studentId);
    if (!taskSolution || !studentAttempt) {
      throw new Error('dbtc-service: Failed to find related question or student attempt');
    }
    const compareData = await this.compareService.compareAndCalculate(
      taskSolution.UmlQuestion.editorData as unknown as editorDataDTO,
      studentAttempt.attemptData,
      taskSolution.score,
    );

    return this.feedbackRagService.generateUmlFeedbackByHighlighted(
      taskSolution.UmlQuestion.text,
      compareData.highlightData,
      Math.floor((compareData.points / taskSolution.score) * 100),
    );
  }

  /**
   * Sets the task attempt data in the database, creating a new task attempt if necessary.
   * If the task attempt data is different from the task attempt, a new task attempt is created.
   * @param taskAttemptData - The task attempt data to be set or updated.
   * @returns A Promise that resolves to the updated or newly created task attempt data.
   */
  async setTaskAttemptData(
    taskAttemptData: taskAttemptDataDTO,
    studentId: number,
  ): Promise<taskAttemptDataDTO> {
    try {
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
                },
              },
            },
          },
        },
      });

      if (
        !taskAttempt ||
        (taskAttempt &&
          this.isDifferentAttemptData(
            taskAttempt.userAnswer[0].UserUmlQuestionAnswer.attemptData,
            taskAttemptData.attemptData,
          ))
      ) {
        //create a new userAnswer and a new UserUmlQuestionAnswer and connect them
        //console.log("not the same",'inDB: ', this.sortObject(JSON.parse(JSON.stringify(taskAttempt.userAnswer[0].UserUmlQuestionAnswer.attemptData))), 'new: ', this.sortObject(JSON.parse(JSON.stringify(taskAttemptData.attemptData))), 'isDifferent: ', this.isDifferentAttemptData(taskAttempt.userAnswer[0].UserUmlQuestionAnswer.attemptData, taskAttemptData.attemptData));
        const newAnswer = await this.prisma.userAnswer.create({
          data: {
            userId: studentId,
            questionId: taskAttemptData.taskId,
            UserUmlQuestionAnswer: {
              create: {
                attemptData: JSON.parse(JSON.stringify({ ...taskAttemptData.attemptData })),
              },
            },
          },
          select: {
            id: true,
            UserUmlQuestionAnswer: {
              select: {
                attemptData: true,
              },
            },
          },
        });
        return {
          userAnswerId: newAnswer.id,
          taskId: taskAttemptData.taskId,
          attemptData: newAnswer.UserUmlQuestionAnswer.attemptData as unknown as editorDataDTO,
        };
      }
      console.log('the same');
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
  private isDifferentAttemptData(
    taskAttempt: Prisma.JsonValue,
    taskAttemptData: editorDataDTO,
  ): boolean {
    const sortedTaskAttempt = this.sortAndStringify(taskAttempt);
    const sortedTaskAttemptData = this.sortAndStringify(taskAttemptData);
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
    return Object.keys(obj)
      .sort()
      .reduce((result: { [key: string]: any }, key: string) => {
        result[key] = this.sortObject(obj[key]);
        return result;
      }, {});
  }
}
