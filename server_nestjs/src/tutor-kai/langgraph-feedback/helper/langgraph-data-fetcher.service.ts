import { Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CryptoService } from './crypto.service'; // Adjust path if necessary
import { CodeSubmissionResult } from '@DTOs/tutorKaiDtos/submission.dto'; // Adjust path if necessary
import { FeedbackContextDto } from '@DTOs/tutorKaiDtos/feedbackContext.dto';

@Injectable()
export class LanggraphDataFetcherService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cryptoService: CryptoService,
  ) {}

  async fetchFeedbackContextDto(
    encryptedSubmissionId: string,
    questionId: number,
    codeSubmissionResult: CodeSubmissionResult,
  ): Promise<FeedbackContextDto> {
    let submissionId: number;
    try {
      submissionId = Number(this.cryptoService.decrypt(encryptedSubmissionId));
    } catch (error) {
      console.error('Error decrypting submission ID:', error);
      throw new InternalServerErrorException('Failed to decrypt submission ID.');
    }

    const submission = await this.prisma.codeSubmission.findUnique({
      where: { id: submissionId },
      select: { code: true, userId: true, createdAt: true, codingQuestionId: true }, // Select necessary fields including codingQuestionId
    });

    if (!submission) {
      throw new NotFoundException(`CodeSubmission with ID ${submissionId} not found.`);
    }

    // Fetch Question including the related CodingQuestion to get the text
    const question = await this.prisma.question.findUnique({
      where: { id: questionId },
      include: {
        codingQuestion: {
          select: {
            text: true, // Task description
            automatedTests: true, // Include automated tests
            codeGerueste: true, // Include code skeletons
            modelSolutions: true, // Include model solutions
          },
        },
      },
    });

    // Check if question and the nested codingQuestion exist
    if (!question || !question.codingQuestion) {
      throw new NotFoundException(
        `Question or associated CodingQuestion with ID ${questionId} not found.`,
      );
    }

    // Calculate attempt count
    const attemptCount = await this.prisma.codeSubmission.count({
      where: {
        userId: submission.userId,
        codingQuestionId: submission.codingQuestionId, // Use the FK from the fetched CodeSubmission entity
        createdAt: {
          lte: submission.createdAt, // Count submissions up to and including the current one
        },
      },
    });

    return {
      studentSolution: submission.code,
      taskDescription: question.codingQuestion.text, // Access text via the included relation
      compilerOutput: codeSubmissionResult.output || null, // Use output from result
      unitTestResults: codeSubmissionResult.testResults || null, // Use testResults from result
      attemptCount: attemptCount,
      automatedTests: question.codingQuestion.automatedTests || [],
      codeGerueste: question.codingQuestion.codeGerueste || [],
      modelSolution: question.codingQuestion.modelSolutions || [], // Include model solutions if needed
      codeSubmissionId: submissionId, // Add the decrypted submission ID
    };
  }
}
