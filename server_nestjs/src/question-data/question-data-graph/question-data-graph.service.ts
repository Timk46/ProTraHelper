import { PrismaService } from '@/prisma/prisma.service';
import { detailedGraphQuestionDTO } from '@Interfaces/detailedQuestion.dto';
import { GraphStructureDTO } from '@Interfaces/graphTask.dto';
import { GraphQuestionDTO } from '@Interfaces/question.dto';
import { Injectable } from '@nestjs/common';

@Injectable()
export class QuestionDataGraphService {

    constructor(private prisma: PrismaService) {}

    async getGraphQuestion(questionId: number, fullData = false): Promise<GraphQuestionDTO> {
        const question = await this.prisma.question.findUnique({
        where: {
            id: Number(questionId)
        }
        });
        const graphQuestion = await this.prisma.graphQuestion.findFirst({
        where: {
            questionId: Number(questionId)
        }
        });
        if (!graphQuestion) {
            throw new Error('GraphQuestion not found');
        }
        return {
            questionId: graphQuestion.questionId,
            title: question.name,
            textHTML: graphQuestion.textHTML || undefined,
            expectations: fullData? graphQuestion.expectations: "",
            expectationsHTML: fullData? (graphQuestion.expectationsHTML || undefined) : undefined,
            type: graphQuestion.type || undefined,
            exampleSolution: fullData? (JSON.parse(JSON.stringify(graphQuestion.exampleSolution)) || undefined) : undefined,
            initialStructure: JSON.parse(JSON.stringify(graphQuestion.initialStructure)) || undefined,
            stepsEnabled: graphQuestion.stepsEnabled || undefined,
            configuration: JSON.parse(JSON.stringify(graphQuestion.configuration)) || undefined,
            maxPoints: question.score,
        };
    }

    async createGraphQuestion(graphQuestion: detailedGraphQuestionDTO, questionId: number): Promise<detailedGraphQuestionDTO> {
        const newGraphQuestion = await this.prisma.graphQuestion.create({
        data: {
            textHTML: graphQuestion.textHTML || undefined,
            expectations: graphQuestion.expectations,
            expectationsHTML: graphQuestion.expectationsHTML || undefined,
            type: graphQuestion.type,
            initialStructure: JSON.parse(JSON.stringify(graphQuestion.initialStructure)),
            exampleSolution: JSON.parse(JSON.stringify(graphQuestion.exampleSolution)),
            stepsEnabled: graphQuestion.stepsEnabled,
            configuration: JSON.parse(JSON.stringify(graphQuestion.configuration)),
            question: {connect: {id: questionId}},
        },
        });

        if(!newGraphQuestion) {
            throw new Error('GraphQuestion not created');
        }

        return {
            ...newGraphQuestion,
            initialStructure: JSON.parse(JSON.stringify(graphQuestion.initialStructure)),
            exampleSolution: JSON.parse(JSON.stringify(graphQuestion.exampleSolution)),
            configuration: JSON.parse(JSON.stringify(graphQuestion.configuration)),
        };
    }

    async updateGraphQuestion(graphQuestion: detailedGraphQuestionDTO): Promise<detailedGraphQuestionDTO> {
        const originalGraphQuestion = await this.prisma.graphQuestion.findFirst({
        where: {
            id: graphQuestion.id
        }
        });

        console.log(graphQuestion);

        const updatedGraphQuestion = await this.prisma.graphQuestion.update({
        where: {
            id: graphQuestion.id
        },
        data: {
            textHTML: graphQuestion.textHTML || originalGraphQuestion.textHTML,
            expectations: graphQuestion.expectations,
            expectationsHTML: graphQuestion.expectationsHTML || originalGraphQuestion.expectationsHTML,
            type: graphQuestion.type || originalGraphQuestion.type,
            initialStructure: JSON.parse(JSON.stringify(graphQuestion.initialStructure)) || originalGraphQuestion.initialStructure,
            exampleSolution: JSON.parse(JSON.stringify(graphQuestion.exampleSolution)) || originalGraphQuestion.exampleSolution,
            stepsEnabled: graphQuestion.stepsEnabled || originalGraphQuestion.stepsEnabled,
            configuration: JSON.parse(JSON.stringify(graphQuestion.configuration)) || originalGraphQuestion.configuration,
        },
        });

        if(!updatedGraphQuestion) {
            throw new Error('GraphQuestion not updated');
        }

        return {
            ...updatedGraphQuestion,
            initialStructure: JSON.parse(JSON.stringify(graphQuestion.initialStructure)),
            exampleSolution: JSON.parse(JSON.stringify(graphQuestion.exampleSolution)),
            configuration: JSON.parse(JSON.stringify(graphQuestion.configuration)),
        };
    }


}
