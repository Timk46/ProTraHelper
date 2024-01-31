import { PrismaService } from '@/prisma/prisma.service';
import { QuestionDTO } from '@DTOs/question.dto';
import { taskOverviewElementDTO } from '@DTOs/taskOverview.dto';
import { Injectable } from '@nestjs/common';

@Injectable()
export class TaskOverviewService {
    constructor(private prisma : PrismaService) {}

    async getTaskOverviewDataForConceptNode(conceptNode_id: number) : Promise<taskOverviewElementDTO[]> {
        
        //schaue in die question tabelle und hole alle fragen mit angegebener conceptNodeId. Dabei soll jede originId nur einmal vorkommen und die neuste version der Frage sein
        const questions = await this.prisma.question.findMany({
            where: {
                conceptNodeId: conceptNode_id,
                isApproved: true,
            },
            select: {
                id: true,
                type: true,
                description: true,
                name: true,
                score: true,
            },
            orderBy: [
                { originId: 'asc' },
                { version: 'desc' },
            ],
            distinct: ['originId'],
        });

        if(!questions) {
            throw new Error('No questions found');
        }

        //get the attemt count and the progress for each question id by looking at the user_answer table
        let taskOverviewData : taskOverviewElementDTO[] = [];
        
        //get the attempt count for each question
        for(let question of questions) {
            let attemptCount = await this.prisma.userAnswer.count({
                where: {
                    questionId: question.id
                },
            });

            //get the best user score for each question
            let userAnswers = await this.prisma.userAnswer.findMany({
                where: {
                    questionId: question.id,
                },
                select: {
                    id: true,
                }
            });

            /*
            let bestScore = 0;
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

            let progress = bestScore / question.score;
            */

            taskOverviewData.push({
                id: question.id,
                type: question.type,
                description: question.description,
                name: question.name,
                attempts: attemptCount,
                progress: 30,
            });
        }

        return taskOverviewData;
    }

}
