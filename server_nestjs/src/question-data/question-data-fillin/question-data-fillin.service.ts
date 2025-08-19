import { PrismaService } from '@/prisma/prisma.service';
import { detailedFillinQuestionDTO, FillinQuestionDTO } from '@DTOs/index';
import { detailedFillinBlankDTO } from '@DTOs/index';
import { Injectable, NotFoundException } from '@nestjs/common';

@Injectable()
export class QuestionDataFillinService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get the fill-in-the-blank task for a specific question.
   * @param {number} questionId
   * @returns {Promise<FillinQuestionDTO>} The task
   */
  async getFillinQuestion(questionId: number): Promise<FillinQuestionDTO> {
    console.log('getFillInTaskId', questionId);
    const task = await this.prisma.fillinQuestion.findUnique({
      where: {
        questionId: Number(questionId),
      },
      include: {
        blanks: true,
        question: true,
      },
    });

    if (!task) {
      throw new NotFoundException(`FillInTask for question ID ${questionId} not found`);
    }

    console.log('task', JSON.stringify(task));
    console.log('tasktype: ' + task.taskType);
    return {
      id: task.id,
      content: task.content,
      taskType: task.taskType,
      table: task.table,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      blanks: task.blanks.map(blank => ({
        id: blank.id,
        blankContent: blank.blankContent,
        position: blank.position.toString(),
        fillinQuestionId: blank.fillinQuestionId,
      })),
      question: {
        id: task.question.id,
        name: task.question.name,
        description: task.question.description,
        score: task.question.score,
        type: task.question.type,
        text: task.question.text,
        level: task.question.level,
        isApproved: task.question.isApproved,
        originId: task.question.originId,
        conceptNodeId: task.question.conceptNodeId,
      },
    };
  }

  /**
   * Creates a new fill-in-the-blank question and associates it with a given question ID.
   *
   * @param questionData - The detailed data for the fill-in-the-blank question.
   * @param questionId - The ID of the question to associate with the new fill-in-the-blank question.
   * @returns A promise that resolves to the created detailed fill-in-the-blank question DTO.
   * @throws An error if the fill-in-the-blank question could not be created.
   */
  async createFillinQuestion(
    questionData: detailedFillinQuestionDTO,
    questionId: number,
  ): Promise<detailedFillinQuestionDTO> {
    const newFillinQuestion = await this.prisma.fillinQuestion.create({
      data: {
        content: questionData.content,
        taskType: questionData.taskType,
        table: questionData.table || false,
        question: { connect: { id: questionId } },
        blanks: {
          create: questionData.blanks.map(blank => ({
            blankContent: blank.blankContent,
            position: blank.position,
            isDistractor: blank.isDistractor,
            isCorrect: blank.isCorrect,
          })),
        },
      },
      include: {
        blanks: true,
      },
    });

    if (!newFillinQuestion) {
      throw new Error('FreeTextQuestion not created');
    }

    return newFillinQuestion;
  }

  async updateFillinQuestion(
    questionData: detailedFillinQuestionDTO,
  ): Promise<detailedFillinQuestionDTO> {
    // Delete blanks that are not in the new data
    const currentBlanks = await this.prisma.blank.findMany({
      where: { fillinQuestionId: questionData.id },
    });
    const newBlankIds = questionData.blanks.map(blank => blank.id);
    const blankIdsToDelete = currentBlanks
      .filter(blank => !newBlankIds.includes(blank.id))
      .map(blank => blank.id);

    await this.prisma.blank.deleteMany({
      where: { id: { in: blankIdsToDelete } },
    });

    // Update the fill-in question
    const updatedFillinQuestion = await this.prisma.fillinQuestion.update({
      where: { id: questionData.id },
      data: {
        updatedAt: new Date(),
        content: questionData.content,
        taskType: questionData.taskType,
        table: questionData.table || false,
        blanks: {
          updateMany: questionData.blanks
            .filter(blank => blank.id !== undefined)
            .map(blank => ({
              where: { id: blank.id },
              data: {
                updatedAt: new Date(),
                blankContent: blank.blankContent,
                position: blank.position,
                isDistractor: blank.isDistractor,
                isCorrect: blank.isCorrect,
              },
            })),
          createMany: {
            data: questionData.blanks
              .filter(blank => blank.id === undefined)
              .map(blank => ({
                blankContent: blank.blankContent,
                position: blank.position,
                isDistractor: blank.isDistractor,
                isCorrect: blank.isCorrect,
              })),
          },
        },
      },
      include: {
        blanks: true,
      },
    });

    if (!updatedFillinQuestion) {
      throw new Error('FreeTextQuestion not updated');
    }

    return updatedFillinQuestion;
  }
}
