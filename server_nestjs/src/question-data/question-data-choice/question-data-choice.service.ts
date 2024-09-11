import { PrismaService } from '@/prisma/prisma.service';
import { MCOptionDTO, MCOptionViewDTO, McQuestionDTO, McQuestionOptionDTO, UserMCOptionSelectedDTO } from '@DTOs/index';
import { Injectable } from '@nestjs/common';

@Injectable()
export class QuestionDataChoiceService {

  constructor(private prisma: PrismaService) {}

  /**
     *
     * @param question_id
     * @returns the mc question data
     */
  async getMCQuestion(question_id: number): Promise<McQuestionDTO> {
    let mcQuestion = await this.prisma.mCQuestion.findFirst({
        where: {
            questionId: Number(question_id)
        }
    })

    let mcQuestionData: McQuestionDTO = {
        id: mcQuestion.id,
        questionId: mcQuestion.questionId,
        textHTML: mcQuestion.textHTML,
        isSC: mcQuestion.isSC,
        shuffleOptions: mcQuestion.shuffleoptions
    }

    return mcQuestionData;
  }

  /**
   *
   * @param mcQuestion_id
   * @returns the options of the mc question
   */
  async getMCOptions(mcQuestion_id: number): Promise<MCOptionViewDTO[]> {
      let mcOptions : MCOptionViewDTO[] = [];

      let mcQuestionOptions = await this.prisma.mCQuestionOption.findMany({
          where: {
              mcQuestionId: Number(mcQuestion_id)
          }
      });

      for(let mcQuestionOption of mcQuestionOptions) {
          let mcOption = await this.prisma.mCOption.findUnique({
              where: {
                  id: Number(mcQuestionOption.mcOptionId)
              }
          })

          let mcOptionData : MCOptionViewDTO = {
              id: mcOption.id,
              text: mcOption.text,
          }

          mcOptions.push(mcOptionData);
      }

      return mcOptions;
  }

  /**
   *
   * @param mcQuestion_id
   * @returns the options of the mc question
   */
  async getMCCheckOptions(mcQuestion_id: number): Promise<MCOptionDTO[]> {
      let mcOptions : MCOptionDTO[] = [];

      let mcQuestionOptions = await this.prisma.mCQuestionOption.findMany({
          where: {
              mcQuestionId: Number(mcQuestion_id)
          }
      });

      for(let mcQuestionOption of mcQuestionOptions) {
          let mcOption = await this.prisma.mCOption.findUnique({
              where: {
                  id: Number(mcQuestionOption.mcOptionId)
              }
          })

          let mcOptionData : MCOptionDTO = {
              id: mcOption.id,
              text: mcOption.text,
              correct: mcOption.is_correct,
          }

          mcOptions.push(mcOptionData);
      }

      return mcOptions;
  }

  /**
     *
     * @param mcOptions
     * @returns Options
     */
  async createOptions(mcOptions: MCOptionDTO[]): Promise<MCOptionDTO[]> {
    let newOptions : MCOptionDTO[] = [];

     const optionPromises = mcOptions.map(async (mcOption) => {
         const newOption =  await this.prisma.mCOption.create({
            data: {
                id: mcOption.id,
                text: mcOption.text,
                is_correct: mcOption.correct
            }
        });
        if(!newOption) {
            throw new Error('Option not created');
        }
        return {...newOption, correct: newOption.is_correct};
    });
    newOptions = await Promise.all(optionPromises);
    return newOptions;
  }

  /**
     *
     * @param mcQuestion
     * @returns McQuestion Object
     */
  async createMcQuestion(mcQuestion: McQuestionDTO): Promise<McQuestionDTO> {

    //console.log("concepts in createMcQuestion", concept);
    const newMcQuestion = await this.prisma.mCQuestion.create({
      data: {
        question: {connect: {id: mcQuestion.questionId}},
        isSC: mcQuestion.isSC,
        shuffleoptions: mcQuestion.shuffleOptions
      },
    });

    if(!newMcQuestion) {
      throw new Error('McQuestion not created');
    }

    return {
      ...newMcQuestion,
      shuffleOptions: newMcQuestion.shuffleoptions
    };
  }

      /**
   *
   * @param mcQuestionOption
   * @returns McQuestionOption Object
   */
  async createMcQuestionOption(mcQuestionOption: McQuestionOptionDTO): Promise<McQuestionOptionDTO> {
    if(mcQuestionOption.mcQuestion === undefined) {
      throw new Error('McQuestion not defined');
    }
    if(!mcQuestionOption.mcQuestion.id) {
      throw new Error('McQuestion ID not defined');
    }
    if(!mcQuestionOption.mcOption.id){
      throw new Error('McOption ID not defined');
    }
    const newMcQuestionOption = await this.prisma.mCQuestionOption.create({
      data: {
        question: {connect: {id: mcQuestionOption.mcQuestion.id}},
        option: {connect: {id: mcQuestionOption.mcOption.id}},
      },
      include: {
        question: {include: {questionVersion: true}},
        option: true,
      }
    });

    if(!newMcQuestionOption) {
      throw new Error('McQuestionOption not created');
    }

    return {
      ...newMcQuestionOption,
      mcOption: {
        ...newMcQuestionOption.option,
        correct: newMcQuestionOption.option.is_correct
      },
      mcQuestion: {
        ...newMcQuestionOption.question,
        shuffleOptions: newMcQuestionOption.question.shuffleoptions,
      }
    };
  }

  /**
     *
     * @param userAnswer_id
     * @param mcOption_id
     * @returns the selected options
     */
  async createUserMCOptionSelected(userAnswer_id: number, mcOption_id: number) : Promise<UserMCOptionSelectedDTO> {
    return await this.prisma.userMCOptionSelected.create({
        data: {
            userAnswerId: userAnswer_id,
            mcOptionId: mcOption_id
        }
    })
  }


}
