import { PrismaService } from '@/prisma/prisma.service';
import { McQuestionDTO, McQuestionOptionDTO, QuestionDTO, QuestionVersionDTO, UserMCAnswerDTO, UserMCOptionSelectedDTO, MCOptionDTO } from '@DTOs/question.dto';
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
        };
    
        return questionData;
    }

    /**
     * 
     * @param questionId 
     * @returns the question version data
     */
    async getQuestionVersion(question_id: number): Promise<QuestionVersionDTO> {
        let questionVersion = await this.prisma.questionVersion.findFirst({
            where: {
                questionId: Number(question_id),
                successorId: null
            }
        });

        if(!questionVersion) {
            throw new Error('Question Version not found');
        }

        let questionVersionData: QuestionVersionDTO = {
            id: questionVersion.id,
            questionId: questionVersion.questionId,
            version: questionVersion.version,
            isApproved: questionVersion.isApproved,
            successor: questionVersion.successorId    
        };

        return questionVersionData;
    }

    /**
     * 
     * @param question_id 
     * @returns the question data of the newest version of the question
     */
    async getNewestQuestionVersion(question_id: number): Promise<QuestionVersionDTO> {
        let questionVersion = await this.prisma.questionVersion.findFirst({
            where: {
                questionId: Number(question_id),
                successor: null,
                isApproved: true
            }
        })

        let questionVersionData: QuestionVersionDTO = {
            id: questionVersion.id,
            questionId: questionVersion.questionId,
            version: questionVersion.version,
            isApproved: questionVersion.isApproved,
            successor: questionVersion.successorId    
        };
        
        return questionVersionData;
    }

    /**
     * 
     * @param questionVersion_id 
     * @returns mc question data
     */
    async getMCQuestion(questionVersion_id: number): Promise<McQuestionDTO> {
        let mcQuestion = await this.prisma.mCQuestion.findFirst({
            where: {
                questionVersionId: Number(questionVersion_id)
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
    async createUserMCAnswer(user_id: number, mcQuestion_id: number) : Promise<UserMCAnswerDTO> {
        return await this.prisma.userMCAnswer.create({
            data: {
                userId: user_id,
                mcQuestionId: mcQuestion_id
            }
        })
    }

    async createUserMCOptionSelected(userMCAnswer_id: number, mcOption_id: number) : Promise<UserMCOptionSelectedDTO> {
        return await this.prisma.userMCOptionSelected.create({
            data: {
                userMCAnswerId: userMCAnswer_id,
                mcOptionId: mcOption_id
            }
        })
    }

}
