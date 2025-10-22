import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import {
  CreateGroupReviewSessionsDTO,
  GroupReviewGateStatusDTO,
  CreateGroupReviewSessionsResultDTO,
} from '@DTOs/index';
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
      gates.map(async gate => {
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
          linkedQuestionName: linkedQuestion.name || 'Unknown Upload Question',
          conceptId: gate.question.conceptNode.id || 0,
          conceptName: gate.question.conceptNode.name || 'No Concept',
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
        await this.prisma.$transaction(async tx => {
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
              groupReviewGateId: gate.id,
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

          // Link categories defined in the gate
          if (gate.linkedCategories) {
            try {
              const parsedObject = JSON.parse(gate.linkedCategories);
              const categoryIds = parsedObject.linkedCategoryIds;

              if (Array.isArray(categoryIds) && categoryIds.length > 0) {
                const categoryLinks = categoryIds.map((catId, index) => ({
                  sessionId: session.id,
                  categoryId: Number(catId),
                  order: index,
                }));

                await tx.evaluationSessionCategory.createMany({
                  data: categoryLinks,
                });
                this.logger.log(`Linked ${categoryLinks.length} categories to session ${session.id}.`);
              }
            } catch (jsonError) {
              this.logger.error(`Failed to parse linkedCategories for gate ${gateId}. Invalid JSON: ${gate.linkedCategories}`, jsonError.stack);
            }
          }

          // Create submissions for newest uploads to the linked question
          const userUploads = await tx.user.findMany({
            where: {
              userAnswer: {
                some: {
                  questionId: gate.linkedQuestionId
                }
              }
            },
            include: {
              userAnswer: {
                where: {
                  questionId: gate.linkedQuestionId,
                  NOT: {
                    UserUploadAnswer: { none: {} }
                  }
                },
                include: {
                  UserUploadAnswer: true,
                },
                orderBy: {
                  createdAt: 'desc'
                },
                take: 1
              },
            }
          });

          if (userUploads.length === 0) {
            this.logger.warn(
              `No uploads found for linkedQuestionId ${gate.linkedQuestionId}. No submissions created for this session.`,
            );
            return;
          }

          for (const user of userUploads) {
            console.log('CURRENT UPLOAD:', user);
            await tx.evaluationSubmission.create({
              data: {
                title: `Abgabe von einem Benutzer`,
                description: `Diese Abgabe ist von der Gruppe zu bewerten.`,
                authorId: user.id,
                pdfFileId: user.userAnswer[0].UserUploadAnswer[0].fileUploadId,
                sessionId: session.id,
                status: EvaluationStatus.SUBMITTED,
                phase: EvaluationPhase.DISCUSSION,
                submittedAt: user.userAnswer[0].UserUploadAnswer[0].createdAt,
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