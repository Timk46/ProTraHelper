import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { detailedGroupReviewGateDTO } from '@DTOs/detailedQuestion.dto';

@Injectable()
export class QuestionDataGroupReviewGateService {
  constructor(private readonly prisma: PrismaService) {}

  async create(questionId: number, dto: detailedGroupReviewGateDTO) {
    return this.prisma.groupReviewGate.create({
      data: {
        questionId: questionId,
        linkedQuestionId: dto.linkedQuestionId,
      },
    });
  }

  async update(id: number, dto: detailedGroupReviewGateDTO) {
    return this.prisma.groupReviewGate.update({
      where: { id },
      data: {
        linkedQuestionId: dto.linkedQuestionId,
      },
    });
  }
}
