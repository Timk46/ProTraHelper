import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import type {
  QuestionDTO,
  CodingQuestionDto,
  CodeGeruestDto,
  AutomatedTestDto,
  CodingQuestionInternal,
} from '@DTOs/index';

/**
 * @description A service class that handles the logic related to questions
 */
@Injectable()
export class QuestionService {
  constructor(private readonly prismaService: PrismaService) {}

  /**
   * @description Retrieve a codingQuestion from the database by its id.
   * Only for backend use! Use The DTO version for frontend use!
   * @returns {Promise<CodingQuestionInternal>} An array of question data transfer objects.
   */
  async findCodingQuestionById(id: number): Promise<CodingQuestionInternal> {
    const codingQuestion = await this.prismaService.codingQuestion.findUnique({
      where: { id },
      include: {
        codeGerueste: true,
        automatedTests: true,
      },
    });
    if (!codingQuestion) {
      throw new Error(`CodingQuestion with ID ${id} not found`);
    }
    return this.mapCodingQuestionToInternal(codingQuestion);
  }

  /**
   * @description Retrieve a codingQuestion (only DTO without Tests) from the database by its id.
   * @returns {Promise<CodingQuestionDto>} An array of question data transfer objects.
   */
  async findCodingQuestionDtoById(id: number): Promise<CodingQuestionDto> {
    const codingQuestion = await this.prismaService.codingQuestion.findUnique({
      where: { id },
      include: {
        codeGerueste: true,
      },
    });
    if (!codingQuestion) {
      throw new Error(`CodingQuestion with ID ${id} not found`);
    }
    return this.mapCodingQuestionToDto(codingQuestion);
  }

  /**
   * @description Retrieve all questions from the database.
   * @returns {Promise<QuestionDTO[]>} An array of question data transfer objects.
   */
  async findAll(): Promise<QuestionDTO[]> {
    const questions = await this.prismaService.question.findMany({
      include: {
        codingQuestion: {
          include: {
            codeGerueste: true,
            automatedTests: true,
          },
        },
      },
    });
    return questions.map((question): QuestionDTO => this.mapQuestionToDto(question));
  }

  /**
   * @description Retrieve a specific question by its ID.
   * @param {number} id - The ID of the question.
   * @returns {Promise<QuestionDTO>} A single question data transfer object.
   * @throws Will throw an error if the question is not found.
   */
  async findOne(id: number): Promise<QuestionDTO> {
    const question = await this.prismaService.question.findUnique({
      where: { id },
      include: {
        codingQuestion: {
          include: {
            codeGerueste: true,
            automatedTests: true,
          },
        },
      },
    });
    if (!question) {
      console.log(`ERROR: Question with ID ${id} not found`);
      throw new NotFoundException(`Question with ID ${id} not found`);
    }
    if (!question.codingQuestion) {
      console.log(`ERROR: Question with ID ${id} is not a coding question`);
      throw new BadRequestException(`Question with ID ${id} is not a coding question`);
    }
    return this.mapQuestionToDto(question);
  }

  /**
   * @description Remove a question by its ID from the database.
   * @param {number} id - The ID of the question.
   * @returns {Promise<void>}
   */
  async remove(id: number): Promise<void> {
    await this.prismaService.question.delete({ where: { id } });
  }

  /**
   * @description Map the coding question data from the database to a data transfer object.
   * @private
   * @param codingQuestion - The raw coding question data from the database.
   * @returns {CodingQuestionDto} The mapped coding question data transfer object.
   */
  private mapCodingQuestionToDto(codingQuestion): CodingQuestionDto {
    const codingQuestionDto: CodingQuestionDto = {
      id: codingQuestion.id,
      count_InputArgs: codingQuestion.count_InputArgs,
      mainFileName: codingQuestion.mainFileName,
      text: codingQuestion.text,
      textHTML: codingQuestion.textHTML,
      programmingLanguage: codingQuestion.programmingLanguage,
      codeGerueste: codingQuestion.codeGerueste.map(codeGeruest => {
        const codeGeruestDto: CodeGeruestDto = {
          id: codeGeruest.id,
          codingQuestionId: codeGeruest.codingQuestionId,
          codeFileName: codeGeruest.codeFileName,
          code: codeGeruest.code,
          language: codeGeruest.language,
        };
        return codeGeruestDto;
      }),
    };
    return codingQuestionDto;
  }

  private mapCodingQuestionToInternal(codingQuestion): CodingQuestionInternal {
    const codingQuestionInternal: CodingQuestionInternal = {
      id: codingQuestion.id,
      count_InputArgs: codingQuestion.count_InputArgs,
      mainFileName: codingQuestion.mainFileName,
      text: codingQuestion.text,
      programmingLanguage: codingQuestion.programmingLanguage,
      textHTML: codingQuestion.textHTML,
      codeGerueste: codingQuestion.codeGerueste.map(codeGeruest => {
        const codeGeruestDto: CodeGeruestDto = {
          id: codeGeruest.id,
          codingQuestionId: codeGeruest.codingQuestionId,
          codeFileName: codeGeruest.codeFileName,
          code: codeGeruest.code,
          language: codeGeruest.language,
        };
        return codeGeruestDto;
      }),
      automatedTests: codingQuestion.automatedTests.map(automatedTest => {
        const automatedTestDto: AutomatedTestDto = {
          id: automatedTest.id,
          code: automatedTest.code,
          testFileName: automatedTest.testFileName,
          language: automatedTest.language,
          questionId: automatedTest.questionId,
        };
        return automatedTestDto;
      }),
    };
    return codingQuestionInternal;
  }

  /**
   * @description Map the question data from the database to a data transfer object.
   * @private
   * @param question - The raw question data from the database.
   * @returns {QuestionDto} The mapped question data transfer object.
   */
  private mapQuestionToDto(question): QuestionDTO {
    const questionDto: QuestionDTO = {
      id: question.id,
      name: question.name,
      description: question.description,
      score: question.score,
      type: question.type,
      isApproved: question.isApproved,
      originId: question.originId,
      text: question.text,
      conceptNodeId: question.conceptNodeId,
      codingQuestion: this.mapCodingQuestionToDto(question.codingQuestion),
      level: question.level,
    };
    return questionDto;
  }
}
