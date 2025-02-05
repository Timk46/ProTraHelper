import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CodeGameQuestionDto } from '@DTOs/question.dto';

@Injectable()
export class QuestionDataCodeGameService {
  constructor(private prisma: PrismaService) {}

  async createCodeGameQuestion(
    codeGameQuestion: CodeGameQuestionDto,
    questionId: number,
  ): Promise<CodeGameQuestionDto> {
    const newCodeGameQuestion = await this.prisma.codeGameQuestion.create({
      data: {
        text: codeGameQuestion.text,
        programmingLanguage: codeGameQuestion.programmingLanguage,
        questionId: questionId,
        codeGameScaffolds: {
          create: codeGameQuestion.codeGameScaffolds.map((cgs) => ({
            codeFileName: cgs.codeFileName,
            code: cgs.code,
            language: cgs.language,
            visible: cgs.visible,
            mainFile: cgs.mainFile,
          })),
        },
        gameFileName: codeGameQuestion.gameFileName,
        game: codeGameQuestion.game,
        gameCellRestrictions: codeGameQuestion.gameCellRestrictions,
        theme: codeGameQuestion.theme,
      },
      include: {
        codeGameScaffolds: true,
      },
    });

    return newCodeGameQuestion;
  }

  async updateCodeGameQuestion(
    codeGameQuestion: CodeGameQuestionDto,
  ): Promise<CodeGameQuestionDto> {
    const updatedCodeGameQuestion = await this.prisma.codeGameQuestion.update({
      where: { id: codeGameQuestion.id },
      data: {
        text: codeGameQuestion.text,
        programmingLanguage: codeGameQuestion.programmingLanguage,
        codeSolutionRestriction: codeGameQuestion.codeSolutionRestriction,
        fileNameToRestrict: codeGameQuestion.fileNameToRestrict,
        methodNameToRestrict: codeGameQuestion.methodNameToRestrict,
        frequencyOfMethodNameToRestrict:
          codeGameQuestion.frequencyOfMethodNameToRestrict,
        codeGameScaffolds: {
          update: codeGameQuestion.codeGameScaffolds.map((cgs) => ({
            where: { id: cgs.id },
            data: {
              codeFileName: cgs.codeFileName,
              code: cgs.code,
              language: cgs.language,
              visible: cgs.visible,
              mainFile: cgs.mainFile,
            },
          })),
        },
        gameFileName: codeGameQuestion.gameFileName,
        game: codeGameQuestion.game,
        gameCellRestrictions: codeGameQuestion.gameCellRestrictions,
        theme: codeGameQuestion.theme,
      },
      include: {
        codeGameScaffolds: true,
      },
    });

    return updatedCodeGameQuestion;
  }
}
