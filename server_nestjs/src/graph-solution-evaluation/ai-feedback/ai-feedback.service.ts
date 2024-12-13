import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { GraphSolutionEvaluationService } from '../graph-solution-evaluation.service';
import { GraphStructureDTO, GraphStructureSemanticDTO } from '@Interfaces/graphTask.dto';
import { graphFeedbackGenerationPrompts } from '../utils/graph-feedback-generation.prompts';
import { graphJSONToSemantic } from '../utils/graph-utils';
import { FeedbackGenerationService } from '@/ai/feedback-generation/feedback-generation.service';

@Injectable()
export class AiFeedbackService {

  constructor(
    private readonly prismaService: PrismaService,
    private readonly graphSolutionEvaluationService: GraphSolutionEvaluationService,
    private readonly feedbackGenerationService: FeedbackGenerationService
  ) {}

  async create(createAiFeedbackDto: { userAnswerId: number }) {
 
    // ##############################
    // Get the user graph answer and graph question
    const userAnswer = await this.prismaService.userAnswer.findFirst({
      where: {
        id: createAiFeedbackDto.userAnswerId
      },
      include: {
        question: {
          include: {
            GraphQuestion: true
          }
        }
      }
    })

    if (!userAnswer) {
      throw new Error('User Answer not found');
    }

    if (!userAnswer.question) {
      throw new Error('Question not found');
    }

    if (!userAnswer.question.GraphQuestion) {
      throw new Error('Graph question not found');
    }

    // ##############################
    // Format data appropriately for the algorithmic evaluation and ai feedback generation 
    const graphQuestion = {
        questionId: userAnswer.question.id,
        title: userAnswer.question.name,
        textHTML: userAnswer.question.GraphQuestion.textHTML || undefined,
        expectations: userAnswer.question.GraphQuestion.expectations,
        expectationsHTML: (userAnswer.question.GraphQuestion.expectationsHTML || undefined),
        type: userAnswer.question.GraphQuestion.type || undefined,
        exampleSolution: JSON.parse(JSON.stringify(userAnswer.question.GraphQuestion.exampleSolution)) || undefined,
        initialStructure: JSON.parse(JSON.stringify(userAnswer.question.GraphQuestion.initialStructure)) || undefined,
        stepsEnabled: userAnswer.question.GraphQuestion.stepsEnabled || undefined,
        configuration: JSON.parse(JSON.stringify(userAnswer.question.GraphQuestion.configuration)) || undefined,
        maxPoints: userAnswer.question.score,
    }

    const studentSolution: GraphStructureDTO[] = JSON.parse(JSON.stringify(userAnswer.userGraphAnswer));

    const initialStructureSemantic = graphJSONToSemantic(graphQuestion.initialStructure);

    const studentSolutionSemantic: GraphStructureSemanticDTO[] = [];
    for (const studentSolutionStep of studentSolution) {
      studentSolutionSemantic.push(graphJSONToSemantic(studentSolutionStep));
    }

        
    // ##############################
    // Evaluate and generate algorithmic feedback
    const { feedback, expectedSolutionSemantic } = this.graphSolutionEvaluationService.evaluateSolution(graphQuestion, studentSolution);


    // ##############################
    // Generate ai feedback
    const graphSystemMessage = graphFeedbackGenerationPrompts.graphFeedbackPrompt(
      userAnswer.question.text,
      JSON.stringify(initialStructureSemantic),
      JSON.stringify(expectedSolutionSemantic),
      JSON.stringify(studentSolutionSemantic),
      feedback,
      graphQuestion.maxPoints
    );

    const systemMessagePrompt = graphSystemMessage.replace(/[{]/g, '{{').replace(/[}]/g, '}}');
    const humanMessagePrompt = JSON.stringify(studentSolutionSemantic).replace(/[{]/g, '{{').replace(/[}]/g, '}}');

    const generatedFeedback = await this.feedbackGenerationService.generateGraphFeedback(
      systemMessagePrompt,
      humanMessagePrompt,
    );

    // Create ai feedback
    const feedbackPrisma = await this.prismaService.graphAIFeedback.create({
      data: {
        prompt: JSON.stringify({
          systemMessagePrompt,
          humanMessagePrompt
        }),
        response: generatedFeedback,
        userAnswerId: createAiFeedbackDto.userAnswerId,
      }
    });

    // Return ai feedback
    return {
      feedbackId: feedbackPrisma.id, 
      feedback: generatedFeedback
    };
  }

  async rateFeedback(id: number, updateAiFeedbackDto: { rating: 1 | 2 | 3 | 4 | 5 }) {
    const updatedFeedback = await this.prismaService.graphAIFeedback.update({
      data: {
        ratingByStudent: updateAiFeedbackDto.rating
      },
      where: {
        id
      }
    });
    
      return updatedFeedback;
    }
  }
