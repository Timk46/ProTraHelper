import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RhinoIntegrationService } from '../rhino-integration/rhino-integration.service';
import {
  CreateMCSliderQuestionDTO,
  MCSliderQuestionResponseDTO,
  MCSliderSubmissionDTO,
  MCSliderItemDTO,
  MCSliderConfigDTO,
  MCSliderRhinoConfigDTO,
  MCSliderSubmissionResultDTO,
  UpdateMCSliderQuestionDTO,
  RhinoExecutionResultDTO,
} from '@DTOs/mcslider.dto';
import { MCSliderItemResponseDTO } from '@DTOs/mcslider.dto';

@Injectable()
export class MCSliderService {
  private readonly logger = new Logger(MCSliderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly rhinoIntegrationService: RhinoIntegrationService,
  ) {}

  /**
   * Creates a new MCSlider question with optional Rhino integration
   */
  async createMCSliderQuestion(
    userId: number,
    createDto: CreateMCSliderQuestionDTO,
  ): Promise<MCSliderQuestionResponseDTO> {
    this.logger.log(`Creating MCSlider question: ${createDto.title}`);

    const question = await this.prisma.question.create({
      data: {
        authorId: userId,
        type: 'MCSLIDER',
        name: createDto.title,
        text: createDto.text,
        score: createDto.maxPoints,
        rhinoEnabled: !!createDto.rhinoIntegration.enabled,
        rhinoGrasshopperFile: createDto.rhinoIntegration.grasshopperFile,
        rhinoAutoLaunch: createDto.rhinoIntegration.autoLaunch ?? false,
        rhinoAutoFocus: createDto.rhinoIntegration.autoFocus ?? true,
        rhinoSettings: createDto.rhinoIntegration
          ? {
              focusDelayMs: createDto.rhinoIntegration.focusDelayMs ?? 1000,
              showViewport: true,
              batchMode: false,
            }
          : null,
      },
    });

    // Create MCSlider-specific data
    await this.prisma.mCSliderQuestion.create({
      data: {
        questionId: question.id,
        items: createDto.items as any,
        config: createDto.config as any,
        rhinoIntegration: createDto.rhinoIntegration as any,
      },
    });

    this.logger.log(`✅ Created MCSlider question with ID: ${question.id}`);
    return this.getMCSliderQuestion(question.id);
  }

  /**
   * Retrieves an MCSlider question by ID
   */
  async getMCSliderQuestion(questionId: number): Promise<MCSliderQuestionResponseDTO> {
    const question = await this.prisma.question.findUnique({
      where: { id: questionId },
      include: {
        mCSliderQuestion: true,
      },
    });

    if (!question || !question.mCSliderQuestion) {
      throw new NotFoundException('MCSlider question not found');
    }

    return {
      id: question.id,
      title: question.name || '',
      text: question.text,
      maxPoints: question.score || 0,
      items: question.mCSliderQuestion.items as any as MCSliderItemDTO[],
      config: question.mCSliderQuestion.config as any as MCSliderConfigDTO,
      rhinoIntegration: question.mCSliderQuestion.rhinoIntegration as any as MCSliderRhinoConfigDTO,
      createdAt: question.createdAt,
      updatedAt: question.updatedAt,
    };
  }

  /**
   * Updates an existing MCSlider question
   */
  async updateMCSliderQuestion(
    questionId: number,
    updateDto: UpdateMCSliderQuestionDTO,
  ): Promise<MCSliderQuestionResponseDTO> {
    const existingQuestion = await this.prisma.question.findUnique({
      where: { id: questionId },
      include: { mCSliderQuestion: true },
    });

    if (!existingQuestion || !existingQuestion.mCSliderQuestion) {
      throw new NotFoundException('MCSlider question not found');
    }

    // Update main question
    if (updateDto.title || updateDto.text || updateDto.maxPoints || updateDto.rhinoIntegration) {
      await this.prisma.question.update({
        where: { id: questionId },
        data: {
          ...(updateDto.title && { name: updateDto.title }),
          ...(updateDto.text && { text: updateDto.text }),
          ...(updateDto.maxPoints && { score: updateDto.maxPoints }),
          ...(updateDto.rhinoIntegration && {
            rhinoEnabled: updateDto.rhinoIntegration.enabled,
            rhinoGrasshopperFile: updateDto.rhinoIntegration.grasshopperFile,
            rhinoAutoLaunch: updateDto.rhinoIntegration.autoLaunch ?? false,
            rhinoAutoFocus: updateDto.rhinoIntegration.autoFocus ?? true,
            rhinoSettings: {
              focusDelayMs: updateDto.rhinoIntegration.focusDelayMs ?? 1000,
              showViewport: true,
              batchMode: false,
            },
          }),
        },
      });
    }

    // Update MCSlider-specific data
    if (updateDto.items || updateDto.config || updateDto.rhinoIntegration) {
      await this.prisma.mCSliderQuestion.update({
        where: { questionId },
        data: {
          ...(updateDto.items && { items: updateDto.items as any }),
          ...(updateDto.config && { config: updateDto.config as any }),
          ...(updateDto.rhinoIntegration && {
            rhinoIntegration: updateDto.rhinoIntegration as any,
          }),
        },
      });
    }

    this.logger.log(`✅ Updated MCSlider question ${questionId}`);
    return this.getMCSliderQuestion(questionId);
  }

  /**
   * Deletes an MCSlider question
   */
  async deleteMCSliderQuestion(questionId: number): Promise<void> {
    const question = await this.prisma.question.findUnique({
      where: { id: questionId },
      include: { mCSliderQuestion: true },
    });

    if (!question || !question.mCSliderQuestion) {
      throw new NotFoundException('MCSlider question not found');
    }

    // Delete the main question (cascade will handle MCSliderQuestion)
    await this.prisma.question.delete({
      where: { id: questionId },
    });

    this.logger.log(`🗑️ Deleted MCSlider question ${questionId}`);
  }

  /**
   * Executes Rhino for an MCSlider question
   */
  async executeRhinoForMCSlider(questionId: number): Promise<RhinoExecutionResultDTO> {
    const question = await this.getMCSliderQuestion(questionId);

    if (!question.rhinoIntegration.enabled) {
      throw new BadRequestException('Rhino integration not enabled for this question');
    }

    this.logger.log(`🦏 Executing Rhino for MCSlider question ${questionId}`);

    return await this.rhinoIntegrationService.executeRhinoForQuestion(
      questionId,
      'batch', // Default for MCSlider
    );
  }

  /**
   * Submits and evaluates an MCSlider answer
   */
  async submitMCSliderAnswer(
    userId: number,
    submissionDto: MCSliderSubmissionDTO,
  ): Promise<MCSliderSubmissionResultDTO> {
    const question = await this.getMCSliderQuestion(submissionDto.questionId);

    this.logger.log(
      `📊 Processing MCSlider submission for question ${submissionDto.questionId} by user ${userId}`,
    );

    // Evaluate responses
    const responses = submissionDto.responses.map((response, index) => {
      const item = question.items[index];
      if (!item) {
        throw new BadRequestException(`Invalid response index: ${index}`);
      }

      const isCorrect = Math.abs(response.userValue - item.correctValue) <= (item.tolerance || 0);
      const partialCredit = this.calculatePartialCredit(response.userValue, item);

      return {
        itemIndex: index,
        userValue: response.userValue,
        correctValue: item.correctValue,
        isCorrect,
        partialCredit,
        feedback: this.generateFeedback(response.userValue, item, isCorrect),
      };
    });

    const totalScore = responses.reduce((sum, response) => sum + response.partialCredit, 0);
    const percentage = (totalScore / question.maxPoints) * 100;

    // Save the answer to the database
    await this.prisma.userAnswer.create({
      data: {
        userId,
        questionId: submissionDto.questionId,
        userFreetextAnswer: JSON.stringify({
          responses,
          totalScore,
          percentage,
          timestamp: submissionDto.timestamp,
        }),
      },
    });

    // Optional: Auto-focus Rhino after submission
    if (question.rhinoIntegration.autoFocus) {
      this.rhinoIntegrationService
        .executeRhinoForQuestion(submissionDto.questionId, 'batch')
        .catch(error => {
          this.logger.warn(`Failed to auto-focus Rhino: ${error.message}`);
        });
    }

    const result = {
      questionId: submissionDto.questionId,
      responses,
      totalScore,
      maxScore: question.maxPoints,
      percentage,
      timestamp: new Date().toISOString(),
    };

    this.logger.log(
      `✅ MCSlider submission completed: ${percentage.toFixed(1)}% (${totalScore}/${
        question.maxPoints
      })`,
    );
    return result;
  }

  /**
   * Gets all MCSlider questions (with pagination)
   */
  async getAllMCSliderQuestions(
    page = 1,
    limit = 20,
    userId?: number,
  ): Promise<{
    questions: MCSliderQuestionResponseDTO[];
    total: number;
    page: number;
    limit: number;
  }> {
    const skip = (page - 1) * limit;

    const where = userId ? { authorId: userId, type: 'MCSLIDER' } : { type: 'MCSLIDER' };

    const [questions, total] = await Promise.all([
      this.prisma.question.findMany({
        where,
        include: { mCSliderQuestion: true },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.question.count({ where }),
    ]);

    const formattedQuestions = questions.map(question => ({
      id: question.id,
      title: question.name || '',
      text: question.text,
      maxPoints: question.score || 0,
      items: (question.mCSliderQuestion.items as any as MCSliderItemDTO[]) || [],
      config:
        (question.mCSliderQuestion.config as any as MCSliderConfigDTO) || ({} as MCSliderConfigDTO),
      rhinoIntegration: question.mCSliderQuestion.rhinoIntegration as any as MCSliderRhinoConfigDTO,
      createdAt: question.createdAt,
      updatedAt: question.updatedAt,
    }));

    return { questions: formattedQuestions, total, page, limit };
  }

  /**
   * Calculates partial credit for a user's answer
   */
  private calculatePartialCredit(userValue: number, item: MCSliderItemDTO): number {
    const diff = Math.abs(userValue - item.correctValue);
    const tolerance = item.tolerance || 0;

    if (diff <= tolerance) {
      return 1.0; // Full credit
    }

    // Linear penalty based on distance from correct value
    const range = item.maxValue - item.minValue;
    const penalty = Math.min(diff / range, 1.0);
    return Math.max(0, 1.0 - penalty);
  }

  /**
   * Generates feedback for a user's answer
   */
  private generateFeedback(userValue: number, item: MCSliderItemDTO, isCorrect: boolean): string {
    if (isCorrect) {
      return 'Correct! Well done.';
    }

    const diff = Math.abs(userValue - item.correctValue);
    const tolerance = item.tolerance || 0;

    if (diff <= tolerance * 2) {
      return 'Close! You were very near the correct answer.';
    } else if (diff <= tolerance * 5) {
      return "Not quite right, but you're on the right track.";
    } else {
      return `The correct answer is ${item.correctValue}${
        item.unit || ''
      }. Try to think about this more carefully.`;
    }
  }
}
