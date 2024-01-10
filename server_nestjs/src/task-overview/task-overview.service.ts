import { PrismaService } from '@/prisma/prisma.service';
import { QuestionDTO } from '@DTOs/question.dto';
import { Injectable } from '@nestjs/common';

@Injectable()
export class TaskOverviewService {
    constructor(private prisma : PrismaService) {}

    async getTaskIdsForConceptNode(conceptNode_id: number) : Promise<number[]> {
        //the array for the question id 
        let question_ids : number[] = [];
        let questions = await this.prisma.question.findMany({
            where: {
                conceptNodeId : Number(conceptNode_id)
            }
        });

        if(!questions) {
            throw new Error('No questions found');
        }
        else {
            for (let question of questions) {
                question_ids.push(question.id);
            }   
        }
        
        return question_ids;
    }

    async getTaskIdentityDataForConceptNode(conceptNode_id: number) : Promise<{id: number, type: string}[]> {
        const questions = await this.prisma.question.findMany({
            where: {
                conceptNodeId : conceptNode_id
            },
            select: {
                id: true,
                type: true
            }
        });
        
        if(!questions) {
            throw new Error('No questions found');
        }
        
        return questions;
    }

    
}
