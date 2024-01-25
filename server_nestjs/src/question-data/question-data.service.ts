import { FeedbackGenerationService } from '@/ai/feedback-generation/feedback-generation.service';
import { PrismaService } from '@/prisma/prisma.service';
import { McQuestionDTO, MCOptionDTO, QuestionDTO, questionType } from '@DTOs/question.dto';
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
            for(let mcOption of mcOptions) {
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
            if (answerData.userFreetextAnswerRaw && answerData.userFreetextAnswerRaw != '') {
                feedbackText = await this.feedbackGenerationService.generateFreetextFeedback({question: question.description, answer: answerData.userFreetextAnswerRaw, conceptNodeId: (question.conceptNode || -1)});
            }
            const userScore = 0;
            //const feedbackText = 'Du hast ' + userScore + ' von ' + question.score + ' Punkten erreicht.';

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
            /* return {
                id: 0,
                userAnswerId: 0,
                score: 0,
                feedbackText: answerData.userFreetextAnswer
            } */
        }

        /**
         * the old returning UserAnswerDataDTO
         *
        return {
            id: createdData.id,
            userId: createdData.userId,
            questionId: createdData.questionId,
            userFreetextAnswer: createdData.userFreetextAnswer,
            userMCAnswer: answerData.userMCAnswer, //maybe also return from createdData...
        }
        */

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
