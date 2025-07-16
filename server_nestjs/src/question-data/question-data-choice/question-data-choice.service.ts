/* eslint-disable prettier/prettier */
import { PrismaService } from '@/prisma/prisma.service';
import {
  detailedChoiceOptionDTO,
  detailedChoiceQuestionDTO,
  MCOptionDTO,
  MCOptionViewDTO,
  McQuestionDTO,
  McQuestionOptionDTO,
  UserMCOptionSelectedDTO,
} from '@DTOs/index';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class QuestionDataChoiceService {
  private readonly logger = new Logger(QuestionDataChoiceService.name);
  constructor(private readonly prisma: PrismaService) {}

  /**
   * @description Retrieves the mc question data
   * @param {number} question_id - The ID of the question.
   * @returns {Promise<McQuestionDTO>} The mc question data.
   */
  async getMCQuestion(question_id: number): Promise<McQuestionDTO> {
    const mcQuestion = await this.prisma.mCQuestion.findFirst({
      where: {
        questionId: Number(question_id),
      },
    });
    this.logger.log(`mcQuestion: ${JSON.stringify(mcQuestion)}`);
    const mcQuestionData: McQuestionDTO = {
      id: mcQuestion.id,
      questionId: mcQuestion.questionId,
      textHTML: mcQuestion.textHTML,
      isSC: mcQuestion.isSC,
      shuffleOptions: mcQuestion.shuffleoptions,
    };

    return mcQuestionData;
  }

  /**
   * @description Retrieves the options of the mc question
   * @param {number} mcQuestion_id - The ID of the mc question.
   * @returns {Promise<MCOptionViewDTO[]>} The options of the mc question.
   */
  async getMCOptions(mcQuestion_id: number): Promise<MCOptionViewDTO[]> {
    const mcOptions: MCOptionViewDTO[] = [];

    const mcQuestionOptions = await this.prisma.mCQuestionOption.findMany({
      where: {
        mcQuestionId: Number(mcQuestion_id),
      },
    });

    for (const mcQuestionOption of mcQuestionOptions) {
      const mcOption = await this.prisma.mCOption.findUnique({
        where: {
          id: Number(mcQuestionOption.mcOptionId),
        },
      });

      const mcOptionData: MCOptionViewDTO = {
        id: mcOption.id,
        text: mcOption.text,
      };

      mcOptions.push(mcOptionData);
    }

    return mcOptions;
  }

  /**
   * @description Retrieves the options of the mc question
   * @param {number} mcQuestion_id - The ID of the mc question.
   * @returns {Promise<MCOptionDTO[]>} The options of the mc question.
   */
  async getMCCheckOptions(mcQuestion_id: number): Promise<MCOptionDTO[]> {
    const mcOptions: MCOptionDTO[] = [];

    const mcQuestionOptions = await this.prisma.mCQuestionOption.findMany({
      where: {
        mcQuestionId: Number(mcQuestion_id),
      },
    });

    for (const mcQuestionOption of mcQuestionOptions) {
      const mcOption = await this.prisma.mCOption.findUnique({
        where: {
          id: Number(mcQuestionOption.mcOptionId),
        },
      });

      const mcOptionData: MCOptionDTO = {
        id: mcOption.id,
        text: mcOption.text,
        correct: mcOption.is_correct,
      };

      mcOptions.push(mcOptionData);
    }

    return mcOptions;
  }

  /**
   * @description Creates the options for the mc question
   * @param {detailedChoiceOptionDTO[]} mcOptions - The options to create.
   * @returns {Promise<detailedChoiceOptionDTO[]>} The created options.
   */
  async createOptions(mcOptions: detailedChoiceOptionDTO[]): Promise<detailedChoiceOptionDTO[]> {
    let newOptions: detailedChoiceOptionDTO[] = [];

    const optionPromises = mcOptions.map(async mcOption => {
      const newOption = await this.prisma.mCOption.create({
        data: {
          text: mcOption.text,
          is_correct: mcOption.is_correct,
        },
      });
      if (!newOption) {
        throw new Error('Option not created');
      }
      return { ...newOption, correct: newOption.is_correct };
    });
    newOptions = await Promise.all(optionPromises);
    return newOptions;
  }

  /**
   * @description Creates the mc question
   * @param {McQuestionDTO} mcQuestion - The mc question to create.
   * @returns {Promise<McQuestionDTO>} The created mc question.
   */
  async createMcQuestion(mcQuestion: McQuestionDTO): Promise<McQuestionDTO> {
    //console.log("concepts in createMcQuestion", concept);
    const newMcQuestion = await this.prisma.mCQuestion.create({
      data: {
        question: { connect: { id: mcQuestion.questionId } },
        isSC: mcQuestion.isSC,
        shuffleoptions: mcQuestion.shuffleOptions,
      },
    });

    if (!newMcQuestion) {
      throw new Error('McQuestion not created');
    }

    return {
      ...newMcQuestion,
      shuffleOptions: newMcQuestion.shuffleoptions,
    };
  }

  /**
   * @description Creates the mc question option
   * @param {McQuestionOptionDTO} mcQuestionOption - The mc question option to create.
   * @returns {Promise<McQuestionOptionDTO>} The created mc question option.
   */
  async createMcQuestionOption(
    mcQuestionOption: McQuestionOptionDTO,
  ): Promise<McQuestionOptionDTO> {
    if (mcQuestionOption.mcQuestion === undefined) {
      throw new Error('McQuestion not defined');
    }
    if (!mcQuestionOption.mcQuestion.id) {
      throw new Error('McQuestion ID not defined');
    }
    if (!mcQuestionOption.option.id) {
      throw new Error('McOption ID not defined');
    }
    const newMcQuestionOption = await this.prisma.mCQuestionOption.create({
      data: {
        question: { connect: { id: mcQuestionOption.mcQuestion.id } },
        option: { connect: { id: mcQuestionOption.option.id } },
      },
      include: {
        question: { include: { questionVersion: true } },
        option: true,
      },
    });

    if (!newMcQuestionOption) {
      throw new Error('McQuestionOption not created');
    }

    return {
      ...newMcQuestionOption,
      option: {
        ...newMcQuestionOption.option,
        correct: newMcQuestionOption.option.is_correct,
      },
      mcQuestion: {
        ...newMcQuestionOption.question,
        shuffleOptions: newMcQuestionOption.question.shuffleoptions,
        mcQuestionOption: [],
      },
    };
  }

  /**
   * @description Creates the user mc option selected
   * @param {number} userAnswer_id - The ID of the user answer.
   * @param {number} mcOption_id - The ID of the mc option.
   * @returns {Promise<UserMCOptionSelectedDTO>} The selected options.
   */
  async createUserMCOptionSelected(
    userAnswer_id: number,
    mcOption_id: number,
  ): Promise<UserMCOptionSelectedDTO> {
    return await this.prisma.userMCOptionSelected.create({
      data: {
        userAnswerId: userAnswer_id,
        mcOptionId: mcOption_id,
      },
    });
  }

  /**
   * @description Creates the choice question
   * @param {detailedChoiceQuestionDTO} mcQuestion - The mc question to create.
   * @returns {Promise<detailedChoiceQuestionDTO>} The created mc question.
   */
  async createChoiceQuestion(
    mcQuestion: detailedChoiceQuestionDTO,
  ): Promise<detailedChoiceQuestionDTO> {
    const newMcQuestion = await this.prisma.mCQuestion.create({
      data: {
        question: { connect: { id: mcQuestion.questionId } },
        isSC: mcQuestion.isSC,
        shuffleoptions: mcQuestion.shuffleoptions,
      },
    });

    const newOptions = await this.createOptions(mcQuestion.mcOptions);

    newOptions.map(async option => {
      await this.prisma.mCQuestionOption.create({
        data: {
          question: { connect: { id: newMcQuestion.id } },
          option: { connect: { id: option.id } },
        },
      });
    });

    return {
      id: newMcQuestion.id,
      questionId: newMcQuestion.questionId,
      textHTML: newMcQuestion.textHTML,
      shuffleoptions: newMcQuestion.shuffleoptions,
      isSC: newMcQuestion.isSC,
      mcOptions: newOptions,
    };
  }

  /**
   * @description Updates the choice question
   * @param {detailedChoiceQuestionDTO} choiceQuestion - The choice question to update.
   * @returns {Promise<detailedChoiceQuestionDTO>} The updated choice question.
   */
  async updateChoiceQuestion(
    choiceQuestion: detailedChoiceQuestionDTO,
  ): Promise<detailedChoiceQuestionDTO> {
    const updatedMcQuestion = await this.prisma.mCQuestion.update({
      where: {
        id: choiceQuestion.id,
      },
      data: {
        updatedAt: new Date(),
        shuffleoptions: choiceQuestion.shuffleoptions,
        isSC: choiceQuestion.isSC,
        textHTML: choiceQuestion.textHTML,
      },
    });

    const updatedOptions = await this.updateOptions(choiceQuestion.id, choiceQuestion.mcOptions);

    return {
      id: updatedMcQuestion.id,
      questionId: updatedMcQuestion.questionId,
      textHTML: updatedMcQuestion.textHTML,
      shuffleoptions: updatedMcQuestion.shuffleoptions,
      isSC: updatedMcQuestion.isSC,
      mcOptions: updatedOptions,
    };
  }

  /**
   * @description Updates the options for the choice question
   * @param {number} choiceQuestionId - The ID of the choice question.
   * @param {detailedChoiceOptionDTO[]} choiceOptions - The options to update.
   * @returns {Promise<detailedChoiceOptionDTO[]>} The updated options.
   */
  async updateOptions(
    choiceQuestionId: number,
    choiceOptions: detailedChoiceOptionDTO[],
  ): Promise<detailedChoiceOptionDTO[]> {
    const updatedOptions: detailedChoiceOptionDTO[] = [];
    // get existing option links
    const exisitingOptions = await this.prisma.mCQuestionOption.findMany({
      where: {
        mcQuestionId: choiceQuestionId,
      },
      select: {
        id: true,
        mcOptionId: true,
      },
    });
    // delete options that are not in the new options
    for (const optionLink of exisitingOptions) {
      if (!choiceOptions.find(o => o.id === optionLink.mcOptionId)) {
        // unlink the option
        await this.prisma.mCQuestionOption.deleteMany({
          where: {
            id: optionLink.id,
          },
        });
        // delete the option
        await this.prisma.mCOption.delete({
          where: {
            id: optionLink.mcOptionId,
          },
        });
      }
    }

    // update or create new options
    for (const mcOption of choiceOptions) {
      if (mcOption.id && mcOption.id != -1) {
        const updatedOption = await this.prisma.mCOption.update({
          where: {
            id: mcOption.id,
          },
          data: {
            updatedAt: new Date(),
            text: mcOption.text,
            is_correct: mcOption.is_correct,
          },
        });
        updatedOptions.push(updatedOption);
      } else {
        const newOption = await this.prisma.mCOption.create({
          data: {
            text: mcOption.text,
            is_correct: mcOption.is_correct,
          },
        });
        // link the new option to the question
        await this.prisma.mCQuestionOption.create({
          data: {
            question: { connect: { id: choiceQuestionId } },
            option: { connect: { id: newOption.id } },
          },
        });
        updatedOptions.push(newOption);
      }
    }

    return updatedOptions;
  }
}
