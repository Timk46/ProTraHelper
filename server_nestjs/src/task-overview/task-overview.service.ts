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

        //get the attemt count for each question id by looking at the user_answer table
        let taskOverviewData : taskOverviewElementDTO[] = [];
        for(let question of questions) {
            let attemptCount = await this.prisma.userAnswer.count({
                where: {
                    questionId: question.id
                }
            });

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
