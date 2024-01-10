import { PrismaService } from '@/prisma/prisma.service';
import { McQuestionDTO, McQuestionOptionDTO, QuestionDTO, QuestionVersionDTO, UserAnswerDTO, UserMCOptionSelectedDTO, MCOptionDTO } from '@DTOs/question.dto';
import { Injectable } from '@nestjs/common';
import {  } from '@prisma/client';

@Injectable()
export class QuestionDataService {
    constructor(private prisma: PrismaService) {}

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
        };
    
        return questionData;
    }

    /**
     * 
     * @param question_id 
     * @returns the question data of the newest version of the question
     */
    async getNewestQuestionVersion(question_id: number): Promise<QuestionDTO> {
        let questionVersion = await this.prisma.question.findFirst({
            where: {
                originId: question_id,
                isApproved: true,
            },
            orderBy: {
                version: 'desc',
            }
        })

        let newestQuestionVersion: QuestionDTO = {
            id: questionVersion.id,
            name: questionVersion.name,
            description: questionVersion.description,
            score: questionVersion.score,
            type: questionVersion.type,
            text: questionVersion.text,
            isApproved: questionVersion.isApproved,
            originId: questionVersion.originId,    
        };
        
        return newestQuestionVersion;
    }

    /**
     * 
     * @param questionVersion_id 
     * @returns mc question data
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
     * @param user_id 
     * @param mcQuestion_id 
     * @returns the new user mc answer
     */
    async createUserAnswer(user_id: number, question_id: number) : Promise<UserAnswerDTO> {
        return await this.prisma.userAnswer.create({
            data: {
                userId: user_id,
                questionId: question_id,
                userFreetextAnswer: null,
                feedbackId: null,
            }
        })
    }

    async createUserMCOptionSelected(userAnswer_id: number, mcOption_id: number) : Promise<UserMCOptionSelectedDTO> {
        return await this.prisma.userMCOptionSelected.create({
            data: {
                userAnswerId: userAnswer_id,
                mcOptionId: mcOption_id
            }
        })
    }

}
