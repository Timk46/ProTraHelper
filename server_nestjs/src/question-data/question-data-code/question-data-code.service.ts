import { PrismaService } from '@/prisma/prisma.service';
import { CodingQuestionInternal } from '@DTOs/index';
import { CodingQuestionDto, detailedQuestionDTO, QuestionDTO } from '@DTOs/index';
import { Injectable } from '@nestjs/common';

@Injectable()
export class QuestionDataCodeService {
  constructor(private readonly prisma: PrismaService) {}

  async createCodingQuestion(
    codingQuestion: CodingQuestionInternal,
    questionId: number,
  ): Promise<CodingQuestionInternal> {
    const newCodingQuestion = await this.prisma.codingQuestion.create({
      data: {
        programmingLanguage: codingQuestion.programmingLanguage,
        expectations: codingQuestion.expectations,
        mainFileName: codingQuestion.mainFileName,
        codeGerueste: {
          create: codingQuestion.codeGerueste.map(cg => ({
            codeFileName: cg.codeFileName,
            code: cg.code,
            language: cg.language,
          })),
        },
        modelSolutions: {
          create: codingQuestion.modelSolutions.map(ms => ({
            codeFileName: ms.codeFileName,
            code: ms.code,
            language: ms.language,
          })),
        },
        automatedTests: {
          create: codingQuestion.automatedTests.map(at => ({
            testFileName: at.testFileName,
            code: at.code,
            language: at.language,
            runMethod: at.runMethod,
            inputArguments: at.inputArguments,
          })),
        },
        count_InputArgs: codingQuestion.count_InputArgs,
        text: codingQuestion.text,
        textHTML: codingQuestion.textHTML,
        question: { connect: { id: questionId } },
      },
      include: {
        codeGerueste: true,
        modelSolutions: true,
        automatedTests: true,
      },
    });

    return newCodingQuestion;
  }

  async updateCodingQuestion(question: CodingQuestionInternal): Promise<CodingQuestionInternal> {
    const updatedQuestion = await this.prisma.codingQuestion.update({
      where: { id: question.id },
      data: {
        programmingLanguage: question.programmingLanguage,
        expectations: question.expectations,
        mainFileName: question.mainFileName,
        codeGerueste: {
          deleteMany: {},
          create: question.codeGerueste.map(cg => ({
            codeFileName: cg.codeFileName,
            code: cg.code,
            language: cg.language,
          })),
        },
        modelSolutions: {
          deleteMany: {},
          create: question.modelSolutions.map(ms => ({
            codeFileName: ms.codeFileName,
            code: ms.code,
            language: ms.language,
          })),
        },
        automatedTests: {
          deleteMany: {},
          create: question.automatedTests.map(at => ({
            testFileName: at.testFileName,
            code: at.code,
            language: at.language,
            runMethod: at.runMethod,
            inputArguments: at.inputArguments,
          })),
        },
        count_InputArgs: question.count_InputArgs,
        text: question.text,
        textHTML: question.textHTML,
      },
      include: {
        codeGerueste: true,
        modelSolutions: true,
        automatedTests: true,
      },
    });

    return updatedQuestion;
  }

  /* async updateCodingQuestionOLD(question: detailedQuestionDTO): Promise<QuestionDTO> {
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
