import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { detailedUploadQuestionDTO, uploadQuestionDTO } from '@DTOs/index';

@Injectable()
export class QuestionDataUploadService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * get the upload question, including full data if requested
   * @param questionId
   * @param fullData if true, all question details are returned
   * @returns the upload question
   */
  async getUploadQuestion(questionId: number, fullData = false): Promise<uploadQuestionDTO> {
    const question = await this.prisma.question.findUnique({
      where: {
        id: Number(questionId),
      },
    });

    const uploadQuestion = await this.prisma.uploadQuestion.findFirst({
      where: {
        questionId: Number(questionId),
      },
    });

    if (!uploadQuestion) {
      throw new Error('UploadQuestion not found');
    }

    return {
      questionId: uploadQuestion.questionId,
      title: question.name,
      text: uploadQuestion.text || question.text,
      textHTML: uploadQuestion.textHTML || undefined,
      maxSize: uploadQuestion.maxSize,
      fileType: uploadQuestion.fileType,
      maxPoints: question.score,
    };
  }

  /**
   * Creates a new upload question.
   *
   * @param uploadQuestion - The detailed information of the upload question to be created.
   * @param questionId - The ID of the associated question.
   * @returns A promise that resolves to the created upload question.
   * @throws An error if the upload question is not created.
   */
  async createUploadQuestion(
    uploadQuestion: detailedUploadQuestionDTO,
    questionId: number,
  ): Promise<detailedUploadQuestionDTO> {
    const newUploadQuestion = await this.prisma.uploadQuestion.create({
      data: {
        title: uploadQuestion.title || '',
        text: uploadQuestion.text || '',
        textHTML: uploadQuestion.textHTML || undefined,
        maxSize: uploadQuestion.maxSize,
        fileType: uploadQuestion.fileType,
        question: { connect: { id: questionId } },
      },
    });

    if (!newUploadQuestion) {
      throw new Error('UploadQuestion not created');
    }
    return newUploadQuestion;
  }

  /**
   * Updates an upload question.
   *
   * @param uploadQuestion - The detailed upload question DTO.
   * @returns A promise that resolves to the updated detailed upload question DTO.
   * @throws An error if the upload question is not updated.
   */
  async updateUploadQuestion(
    uploadQuestion: detailedUploadQuestionDTO,
  ): Promise<detailedUploadQuestionDTO> {
    const originalUploadQuestion = await this.prisma.uploadQuestion.findFirst({
      where: {
        id: uploadQuestion.id,
      },
    });

    console.log(uploadQuestion);

    const updatedUploadQuestion = await this.prisma.uploadQuestion.update({
      where: {
        id: uploadQuestion.id,
      },
      data: {
        title: uploadQuestion.title || originalUploadQuestion.title,
        text: uploadQuestion.text || originalUploadQuestion.text,
        textHTML: uploadQuestion.textHTML || originalUploadQuestion.textHTML,
        maxSize: uploadQuestion.maxSize,
        fileType: uploadQuestion.fileType,
      },
    });

    if (!updatedUploadQuestion) {
      throw new Error('UploadQuestion not updated');
    }
    return updatedUploadQuestion;
  }
}
