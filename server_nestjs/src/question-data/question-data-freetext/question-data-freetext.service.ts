import { PrismaService } from '@/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { QuestionDataService } from '../question-data.service';
import { detailedFreetextQuestionDTO, freeTextQuestionDTO } from '@DTOs/index';

@Injectable()
export class QuestionDataFreetextService {

  constructor(private prisma: PrismaService) {}

  /**
     * get the free text question, including the solution and expectations if requested
     * @param questionVersionId
     * @param fullData if true, the solution and expectations are returned
     * @returns the free text question
     */
  async getFreeTextQuestion(questionId: number, fullData = false): Promise<freeTextQuestionDTO> {
    const question = await this.prisma.question.findUnique({
      where: {
        id: Number(questionId)
      }
    });
    const freeTextQuestion = await this.prisma.freeTextQuestion.findFirst({
      where: {
        questionId: Number(questionId)
      }
    });
    if (!freeTextQuestion) {
      throw new Error('FreeTextQuestion not found');
    }
    return {
      questionId: freeTextQuestion.questionId,
      title: question.name,
      text: question.text,
      textHTML: freeTextQuestion.textHTML || undefined,
      expectations: fullData? freeTextQuestion.expectations: "",
      expectationsHTML: fullData? (freeTextQuestion.expectationsHTML || undefined) : undefined,
      exampleSolution: fullData? (freeTextQuestion.exampleSolution || undefined) : undefined,
      exampleSolutionHTML: fullData? (freeTextQuestion.exampleSolutionHTML || undefined) : undefined,
      maxPoints: question.score,
    };
  }

  /**
     * Creates a new free text question.
     *
     * @param freeTextQuestion - The detailed information of the free text question to be created.
     * @returns A promise that resolves to the created free text question.
     * @throws An error if the free text question is not created.
     */
  async createFreeTextQuestion(freeTextQuestion: detailedFreetextQuestionDTO, questionId: number): Promise<detailedFreetextQuestionDTO> {
    const newFreeTextQuestion = await this.prisma.freeTextQuestion.create({
      data: {
        textHTML: freeTextQuestion.textHTML || undefined,
        expectations: freeTextQuestion.expectations,
        expectationsHTML: freeTextQuestion.expectationsHTML || undefined,
        exampleSolution: freeTextQuestion.exampleSolution,
        exampleSolutionHTML: freeTextQuestion.exampleSolutionHTML || undefined,
        question: {connect: {id: questionId}},
      },
    });

    if(!newFreeTextQuestion) {
      throw new Error('FreeTextQuestion not created');
    }
    return newFreeTextQuestion;
  }

  /**
     * Updates a free text question.
     *
     * @param freeTextQuestion - The detailed free text question DTO.
     * @returns A promise that resolves to the updated detailed free text question DTO.
     * @throws An error if the free text question is not updated.
     */
  async updateFreeTextQuestion(freeTextQuestion: detailedFreetextQuestionDTO): Promise<detailedFreetextQuestionDTO> {
    const originalFreeTextQuestion = await this.prisma.freeTextQuestion.findFirst({
      where: {
        id: freeTextQuestion.id
      }
    });

    console.log(freeTextQuestion);

    const updatedFreeTextQuestion = await this.prisma.freeTextQuestion.update({
      where: {
        id: freeTextQuestion.id
      },
      data: {
        textHTML: freeTextQuestion.textHTML || originalFreeTextQuestion.textHTML,
        expectations: freeTextQuestion.expectations,
        expectationsHTML: freeTextQuestion.expectationsHTML || originalFreeTextQuestion.expectationsHTML,
        exampleSolution: freeTextQuestion.exampleSolution || originalFreeTextQuestion.exampleSolution,
        exampleSolutionHTML: freeTextQuestion.exampleSolutionHTML || originalFreeTextQuestion.exampleSolutionHTML,
      },
    });

    if(!updatedFreeTextQuestion) {
      throw new Error('FreeTextQuestion not updated');
    }
    return updatedFreeTextQuestion;
  }


}
