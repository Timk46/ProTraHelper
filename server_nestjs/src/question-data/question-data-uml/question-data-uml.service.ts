import { PrismaService } from '@/prisma/prisma.service';
import {
  detailedUmlQuestionDTO,
  editorDataDTO,
  taskSettingsDTO,
  UmlQuestionDTO,
} from '@DTOs/index';
import { Injectable } from '@nestjs/common';

@Injectable()
export class QuestionDataUmlService {
  constructor(private readonly prisma: PrismaService) {}

  async getUmlQuestion(questionId: number): Promise<UmlQuestionDTO> {
    const question = await this.prisma.question.findUnique({
      where: {
        id: Number(questionId),
      },
    });
    const umlQuestion = await this.prisma.umlQuestion.findFirst({
      where: {
        questionId: Number(questionId),
      },
    });
    if (!umlQuestion) {
      throw new Error('FreeTextQuestion not found');
    }
    return {
      questionId: umlQuestion.questionId,
      title: question.name,
      text: question.text,
      textHTML: umlQuestion.textHTML || undefined,
      maxPoints: question.score,
    };
  }

  async createUmlQuestion(
    umlQuestion: detailedUmlQuestionDTO,
    questionId: number,
  ): Promise<detailedUmlQuestionDTO> {
    const newUmlQuestion = await this.prisma.umlQuestion.create({
      data: {
        title: umlQuestion.title,
        text: umlQuestion.text,
        textHTML: umlQuestion.textHTML || undefined,
        editorData: JSON.parse(JSON.stringify(umlQuestion.editorData)) || undefined,
        startData: JSON.parse(JSON.stringify(umlQuestion.startData)) || undefined,
        dataImage: umlQuestion.dataImage || undefined,
        taskSettings: JSON.parse(JSON.stringify(umlQuestion.taskSettings)) || undefined,
        question: { connect: { id: questionId } },
      },
    });
    if (!newUmlQuestion) {
      throw new Error('UmlQuestion not created');
    }
    return {
      ...newUmlQuestion,
      editorData: newUmlQuestion.editorData as unknown as editorDataDTO,
      startData: newUmlQuestion.startData as unknown as editorDataDTO,
      taskSettings: newUmlQuestion.taskSettings as unknown as taskSettingsDTO,
    };
  }

  async updateUmlQuestion(umlQuestion: detailedUmlQuestionDTO): Promise<detailedUmlQuestionDTO> {
    const originalUmlQuestion = await this.prisma.umlQuestion.findUnique({
      where: {
        id: umlQuestion.id,
      },
    });
    if (!originalUmlQuestion) {
      throw new Error('UmlQuestion not found');
    }
    const updatedUmlQuestion = await this.prisma.umlQuestion.update({
      where: { id: umlQuestion.id },
      data: {
        title: umlQuestion.title || originalUmlQuestion.title,
        text: umlQuestion.text || originalUmlQuestion.text,
        textHTML: umlQuestion.textHTML || originalUmlQuestion.textHTML,
        editorData:
          JSON.parse(JSON.stringify(umlQuestion.editorData)) || originalUmlQuestion.editorData,
        startData:
          JSON.parse(JSON.stringify(umlQuestion.startData)) || originalUmlQuestion.startData,
        dataImage: umlQuestion.dataImage || originalUmlQuestion.dataImage,
        taskSettings:
          JSON.parse(JSON.stringify(umlQuestion.taskSettings)) || originalUmlQuestion.taskSettings,
      },
    });
    if (!updatedUmlQuestion) {
      throw new Error('UmlQuestion not updated');
    }
    return {
      ...updatedUmlQuestion,
      editorData: updatedUmlQuestion.editorData as unknown as editorDataDTO,
      startData: updatedUmlQuestion.startData as unknown as editorDataDTO,
      taskSettings: updatedUmlQuestion.taskSettings as unknown as taskSettingsDTO,
    };
  }
}
