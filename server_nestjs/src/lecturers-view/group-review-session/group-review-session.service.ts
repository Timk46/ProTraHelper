import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateGroupReviewSessionsDTO, GroupReviewGateStatusDTO, CreateGroupReviewSessionsResultDTO } from '@DTOs/index';
import { GlobalRole, EvaluationPhase, EvaluationStatus } from '@prisma/client';

@Injectable()
export class GroupReviewSessionService {
  private readonly logger = new Logger(GroupReviewSessionService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getGroupReviewGateStatuses(): Promise<GroupReviewGateStatusDTO[]> {
    this.logger.log('Fetching group review gate statuses...');

    const gates = await this.prisma.groupReviewGate.findMany({
      include: {
        question: {
          include: {
            conceptNode: true,
          },
        },
      },
    });

    // TODO: This should be scoped to a module/course, not all students in the system.
    const totalStudents = await this.prisma.user.count({
      where: { globalRole: GlobalRole.STUDENT },
    });

    const statuses: GroupReviewGateStatusDTO[] = await Promise.all(
      gates.map(async (gate) => {
        const linkedQuestion = await this.prisma.question.findUnique({
          where: { id: gate.linkedQuestionId },
        });

        const submittedStudents = await this.prisma.userAnswer.count({
          where: {
            questionId: gate.linkedQuestionId,
            UserUploadAnswer: {
              some: {},
            },
          },
        });

        return {
          gateId: gate.questionId,
          gateName: gate.question.name,
          linkedQuestionId: gate.linkedQuestionId,
          linkedQuestionName: linkedQuestion?.name || 'Unknown Upload Question',
          conceptId: gate.question.conceptNode?.id || 0,
          conceptName: gate.question.conceptNode?.name || 'No Concept',
          totalStudents: totalStudents,
          submittedStudents: submittedStudents,
        };
      }),
    );

    return statuses;
  }

  async createSessionsForGates(
    dto: CreateGroupReviewSessionsDTO,
    creatorId: number,
  ): Promise<CreateGroupReviewSessionsResultDTO> {
    this.logger.log(`User ${creatorId} is creating sessions for ${dto.gateIds.length} gates.`);

    const results: CreateGroupReviewSessionsResultDTO = {
      createdSessions: 0,
      createdSubmissions: 0,
      errors: [],
    };

    for (const gateId of dto.gateIds) {
      try {
        await this.prisma.$transaction(async (tx) => {
          const gate = await tx.groupReviewGate.findUnique({
            where: { questionId: gateId },
            include: { question: true },
          });

          if (!gate) {
            throw new NotFoundException(`GroupReviewGate with questionId ${gateId} not found.`);
          }

          // TODO: Determine moduleId dynamically. Hardcoding to 1 for now.
          const moduleId = 1;

          const session = await tx.evaluationSession.create({
            data: {
              title: `${dto.sessionTitle} - ${gate.question.name}`,
              description: `Peer-Review-Session für die Aufgabe "${gate.question.name}".`,
              startDate: new Date(),
              endDate: dto.reviewDeadline,
              moduleId: moduleId,
              createdById: creatorId,
              phase: EvaluationPhase.DISCUSSION,
            },
          });
          results.createdSessions++;

          const userUploads = await tx.userUploadAnswer.findMany({
            where: { userAnswer: { questionId: gate.linkedQuestionId } },
            include: { userAnswer: { include: { user: true } }, file: true },
          });

          if (userUploads.length === 0) {
            this.logger.warn(
              `No uploads found for linkedQuestionId ${gate.linkedQuestionId}. No submissions created for this session.`,
            );
            return;
          }

          for (const upload of userUploads) {
            await tx.evaluationSubmission.create({
              data: {
                title: `Abgabe von ${upload.userAnswer.user.firstname}`,
                description: `Eingereichte Datei: ${upload.file.name}`,
                authorId: upload.userAnswer.userId,
                pdfFileId: upload.fileId,
                sessionId: session.id,
                status: EvaluationStatus.SUBMITTED,
                phase: EvaluationPhase.DISCUSSION,
                submittedAt: upload.createdAt,
              },
            });
            results.createdSubmissions++;
          }
        });
      } catch (error) {
        const errorMessage = `Failed to create session for gate ${gateId}: ${error.message}`;
        this.logger.error(errorMessage);
        results.errors.push(errorMessage);
      }
    }

    this.logger.log(`Session creation finished. Results: ${JSON.stringify(results)}`);
    return results;
  }
}
