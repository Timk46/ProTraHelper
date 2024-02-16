/* eslint-disable prettier/prettier */
import { FeedbackGenerationService } from '@/ai/feedback-generation/feedback-generation.service';
import { PrismaService } from '@/prisma/prisma.service';
import { McQuestionDTO, MCOptionDTO, QuestionDTO, questionType, McQuestionOptionDTO, freeTextQuestionDTO } from '@DTOs/question.dto';
import { UserAnswerDataDTO, UserMCOptionSelectedDTO, userAnswerFeedbackDTO } from '@DTOs/userAnswer.dto';
import { Injectable } from '@nestjs/common';
import {  } from '@prisma/client';

@Injectable()
export class QuestionDataService {
    constructor(private prisma: PrismaService, private feedbackGenerationService: FeedbackGenerationService) {}

    /**
     *
     * @param questionId
     * @returns the question data
     */
    async getQuestion(questionId: number): Promise<QuestionDTO> {
        let question = await this.prisma.question.findUnique({
            where: {
                id: Number(questionId)
            }
        });

        if(!question) {
            throw new Error('Question not found');
        }

        let questionData: QuestionDTO = {
            id: question.id,
            name: question.name,
            description: question.description,
            score: question.score,
            type: question.type,
            text: question.text,
            isApproved: question.isApproved,
            originId: question.originId,
            conceptNode: question.conceptNodeId || undefined
        };

        return questionData;
    }

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
    async getMCOptions(mcQuestion_id: number): Promise<MCOptionDTO[]> {
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
                isCorrect: mcOption.is_correct
            }

            mcOptions.push(mcOptionData);
        }

        return mcOptions;
    }

    /**
     * get the free text question, including the solution and expectations if requested
     * @param questionVersionId
     * @param fullData if true, the solution and expectations are returned
     * @returns the free text question
     */
    async getFreeTextQuestion(questionId: number, fullData: boolean = false): Promise<freeTextQuestionDTO> {
      let freeTextQuestion = await this.prisma.freeTextQuestion.findFirst({
          where: {
              questionId: Number(questionId)
          }
      });
      if (!freeTextQuestion) {
          throw new Error('FreeTextQuestion not found');
      }
      return {
        questionId: freeTextQuestion.questionId,
        title: freeTextQuestion.title,
        text: freeTextQuestion.text,
        textHTML: freeTextQuestion.textHTML || undefined,
        expectations: fullData? freeTextQuestion.expectations: "",
        expectationsHTML: fullData? (freeTextQuestion.expectationsHTML || undefined) : undefined,
        exampleSolution: fullData? (freeTextQuestion.exampleSolution || undefined) : undefined,
        exampleSolutionHTML: fullData? (freeTextQuestion.exampleSolutionHTML || undefined) : undefined,
        maxPoints: freeTextQuestion.maxPoints
      };
    }

    /**
     *
     * @param question
     * @returns question Data
     */
    async createQuestion(question: QuestionDTO): Promise<QuestionDTO> {
         if(question.author === undefined) {
           throw new Error('Author not defined');
         }
        const concept = await this.prisma.conceptNode.findFirst({
            where: {
                name: question.conceptNodeName
            }
        });
        console.log("question origin Id", question.originId);
        let newQuestion = await this.prisma.question.create({
            data: {
                author:  {connect: {id: question.author}},
                description: question.description,
                score: question.score,
                type: question.type,
                text: question.text,
                isApproved: question.isApproved,
                conceptNode: {connect: {id: concept.id}},
            }
        });

        newQuestion = await this.prisma.question.update({
          where: {
            id: newQuestion.id
          },
          data: {
            originId: newQuestion.id
          }
        });

        if(!newQuestion) {
            throw new Error('Question not created');
        }

        return newQuestion;
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
                    is_correct: mcOption.isCorrect
                }
            });
            if(!newOption) {
                throw new Error('Option not created');
            }
            return {...newOption, isCorrect: newOption.is_correct};
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

        return {...newMcQuestion,
                shuffleOptions: newMcQuestion.shuffleoptions};
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

        return {...newMcQuestionOption,
                mcOption: {...newMcQuestionOption.option,
                          isCorrect: newMcQuestionOption.option.is_correct},
                mcQuestion: {...newMcQuestionOption.question,
                            shuffleOptions: newMcQuestionOption.question.shuffleoptions,
                          }};
    }

    /**
     *
     * @param userId
     * @param answerData
     * @returns the new user answer
     */
    async createUserAnswer(userId: number, answerData: UserAnswerDataDTO) : Promise<userAnswerFeedbackDTO> {
        const createdData = await this.prisma.userAnswer.create({
            data: {
                userId: userId,
                questionId: answerData.questionId,
                //if answerData has a userFreetextAnswer, use it, else use null
                userFreetextAnswer: answerData.userFreetextAnswer ?? null,
            }
        });

        if (!createdData) throw new Error('Could not create userAnswer');

        //connect all mc options
        if (answerData.userMCAnswer) {
            for (const mcOptionId of answerData.userMCAnswer) {
                await this.createUserMCOptionSelected(createdData.id, mcOptionId);
            }
        }

        const question = await this.getQuestion(answerData.questionId);
        if (!question) throw new Error('Could not get question');

        //generate feedback for user answer
        if (question.type === questionType.MULTIPLECHOICE) { //  && answerData.userMCAnswer
            console.log('generate feedback for user answer');
            //const question = await this.getQuestion(answerData.questionId);
            const mcOptions = await this.getMCOptions(answerData.questionId);
            let userScore = 0;
            const scorePerOption = question.score / mcOptions.length;

            //generate user score
            for(const mcOption of mcOptions) {
                if (mcOption.isCorrect && answerData.userMCAnswer.includes(mcOption.id)) {
                    userScore += scorePerOption;
                }
                else if (!mcOption.isCorrect && !answerData.userMCAnswer.includes(mcOption.id)) {
                    userScore += scorePerOption;
                }
            }

            const feedbackText = 'Du hast ' + userScore + ' von ' + question.score + ' Punkten erreicht.';

            console.log(feedbackText);

            //create feedback for user answer
            const feedback = await this.prisma.feedback.create({
                data: {
                    userAnswerId: createdData.id,
                    text: feedbackText,
                    score: userScore
                }
            });

            if (!feedback) throw new Error('Could not create Feedback');

            return {
                id: feedback.id,
                userAnswerId: feedback.userAnswerId,
                score: feedback.score,
                feedbackText: feedback.text
            }
        }

        //generate feedback for user freetext answer
        if (question.type === questionType.FREETEXT && question.description) {
            console.log('generate feedback for user answer');

            //TODO: generate a feedback text based on the user answer
            let feedbackText: string = 'Du hast keine Antwort eingeben.';
            let userScore = 0;
            if (answerData.userFreetextAnswerRaw && answerData.userFreetextAnswerRaw != '') {
              await this.getFreeTextQuestion(answerData.questionId, true).then(async (questionData) => {
                await this.feedbackGenerationService.generateFreetextFeedback(questionData, answerData.userFreetextAnswerRaw).then((feedback) => {
                  feedbackText = feedback.feedbackText;
                  userScore = feedback.reachedPoints;
                });
              });
            }

            console.log('generated Text:', feedbackText);

            //create feedback for user answer
            const feedback = await this.prisma.feedback.create({
                data: {
                    userAnswerId: createdData.id,
                    text: feedbackText,
                    score: userScore
                }
            });

            if (!feedback) throw new Error('Could not create Feedback');

            return {
                id: feedback.id,
                userAnswerId: feedback.userAnswerId,
                score: feedback.score,
                feedbackText: feedback.text
            }

        }

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
