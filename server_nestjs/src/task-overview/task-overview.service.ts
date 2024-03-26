/* eslint-disable prefer-const */
/* eslint-disable prettier/prettier */
import { PrismaService } from '@/prisma/prisma.service';
import { QuestionDTO } from '@DTOs/question.dto';
import { taskOverviewElementDTO } from '@DTOs/taskOverview.dto';
import { Injectable } from '@nestjs/common';

@Injectable()
export class TaskOverviewService {
    constructor(private prisma : PrismaService) {}

    async getTaskOverviewData(question_id: number, user_id: number) : Promise<taskOverviewElementDTO> {

        //get the newest version of the question with the given question_id. the newest version is the one with the highest version number and same originId
        let question = await this.prisma.question.findFirst({
            where: {
                originId: question_id,
                isApproved: true,
            },
            select: {
                id: true,
                type: true,
                description: true,
                name: true,
                score: true,
                level: true,
                mode: true,
            },
            orderBy: [
                { version: 'desc' },
            ],
        });

        /*
        const question = await this.prisma.question.findMany({
            where: {
                originId: question_id,
                isApproved: true,
            },
            select: {
                id: true,
                type: true,
                description: true,
                name: true,
                score: true,
                level: true,
                mode: true,
            },
            orderBy: [
                { originId: 'asc' },
                { version: 'desc' },
            ],
            distinct: ['originId'],
        });

        if(!question) {
            throw new Error('No question found');
        }
        */

        //get the attemt count and the progress for each question id by looking at the user_answer table
        //get the attempt count for the question
        let attemptCount = await this.prisma.userAnswer.count({
            where: {
                questionId: question.id,
                userId: user_id,
            },
        });

        //get the best user score for each question
        let userAnswers = await this.prisma.userAnswer.findMany({
            where: {
                questionId: question.id,
                userId: user_id,
            },
            select: {
                id: true,
            }
        });

        let bestScore = 0;
        if(userAnswers) {
            for(let userAnswer of userAnswers) {
                let feedback = await this.prisma.feedback.findUnique({
                    where: {
                        id: userAnswer.id,
                    },
                    select: {
                        score: true,
                    }
                });
                if(feedback.score > bestScore) {
                    bestScore = feedback.score;
                }
            }
        }

        let progress = (bestScore / question.score)*100;

        let taskOverviewData : taskOverviewElementDTO;
        taskOverviewData = {
            id: question.id,
            type: question.type,
            description: question.description,
            name: question.name,
            attempts: attemptCount,
            progress: progress,
            mode: question.mode,
            level: question.level,
        };

        return taskOverviewData;
    }

}
