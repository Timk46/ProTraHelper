import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { detailedQuestionDTO, QuestionDTO } from '../../../shared/dtos';

@Injectable()
export class EditCodeService {
  constructor(private prisma: PrismaService) {}

  /* async updateCodingQuestion(question: detailedQuestionDTO): Promise<QuestionDTO> {
    const updatedQuestion = await this.prisma.question.update({
      where: { id: question.id },
      data: {
        name: question.name,
        text: question.text,
        type: question.type,
        isApproved: question.isApproved,
        level: question.level,
        codingQuestion: {
          update: {
            programmingLanguage: question.codingQuestion.programmingLanguage,
            expectations: question.codingQuestion.expectations,
            mainFileName: question.codingQuestion.mainFileName,
            codeGerueste: {
              deleteMany: {},
              create: question.codingQuestion.codeGerueste.map(cg => ({
                codeFileName: cg.codeFileName,
                code: cg.code,
                language: cg.language,
              })),
            },
            modelSolutions: {
              deleteMany: {},
              create: question.codingQuestion.modelSolutions.map(ms => ({
                codeFileName: ms.codeFileName,
                code: ms.code,
                language: ms.language,
              })),
            },
            automatedTests: {
              deleteMany: {},
              create: question.codingQuestion.automatedTests.map(at => ({
                testFileName: at.testFileName,
                code: at.code,
                language: at.language,
                runMethod: at.runMethod,
                inputArguments: at.inputArguments,
              })),
            },
          },
        },
      },
      include: {
        codingQuestion: {
          include: {
            codeGerueste: true,
            modelSolutions: true,
            automatedTests: true,
          },
        },
      },
    });

    return {
      id: updatedQuestion.id,
      name: updatedQuestion.name,
      text: updatedQuestion.text,
      type: updatedQuestion.type,
      isApproved: updatedQuestion.isApproved,
      level: updatedQuestion.level,
      codingQuestion: updatedQuestion.codingQuestion,
    };
  } */
}
