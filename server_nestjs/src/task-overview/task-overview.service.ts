import { PrismaService } from '@/prisma/prisma.service';
import { QuestionDTO } from '@DTOs/question.dto';
import { taskOverviewElementDTO } from '@DTOs/taskOverview.dto';
import { Injectable } from '@nestjs/common';

@Injectable()
export class TaskOverviewService {
    constructor(private prisma : PrismaService) {}

    async getTaskOverviewDataForConceptNode(conceptNode_id: number) : Promise<taskOverviewElementDTO[]> {
        const questions = await this.prisma.question.findMany({
            where: {
                conceptNodeId : conceptNode_id,
                originId: null
            },
            select: {
                id: true,
                type: true,
                description: true,
                name: true,
            }
        });
        
        if(!questions) {
            throw new Error('No questions found');
        }
        
        return questions;
    }

}
