import { CryptoService } from '../langgraph-feedback/helper/crypto.service';
import { PrismaService } from '@/prisma/prisma.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class StudentRatingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cryptoService: CryptoService,
  ) {}
  /**
   * Insert student feedback
   * @param {number} rating - The numerical rating the student gave.
   * @param {string} feedback - The student's feedback message.
   * @param {string} lastSubmissionId - The encrypted id of the last submission provided by the student.
   */
  async insertStudentFeedback(
    rating: number,
    feedback: string,
    lastSubmissionId: string,
  ): Promise<void> {
    const submissionId = Number(this.cryptoService.decrypt(lastSubmissionId));

    // Find the KIFeedback instance based on the submissionId
    const kiFeedback = await this.prisma.kIFeedback.findFirst({
      where: { submissionId: submissionId },
    });

    if (!kiFeedback) {
      throw new Error('KIFeedback not found for the given submissionId');
    }

    // Update the KIFeedback using its id
    await this.prisma.kIFeedback.update({
      where: { id: kiFeedback.id },
      data: {
        feedbackByStudent: feedback,
        ratingByStudent: rating,
      },
    });
  }
}
