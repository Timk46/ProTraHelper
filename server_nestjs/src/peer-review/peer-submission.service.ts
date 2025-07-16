import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { 
  CreatePeerSubmissionDTO, 
  UpdatePeerSubmissionDTO, 
  PeerSubmissionDTO 
} from '../../../shared/dtos/peer-submission.dto';
import { PeerReviewStatus } from '../../../shared/dtos/peer-review-session.dto';

@Injectable()
export class PeerSubmissionService {
  constructor(private prisma: PrismaService) {}

  async createSubmission(
    createDto: CreatePeerSubmissionDTO,
    userId: number
  ): Promise<PeerSubmissionDTO> {
    // Check if session exists and is in submission phase
    const session = await this.prisma.peerReviewSession.findUnique({
      where: { id: createDto.sessionId },
      select: { 
        status: true, 
        submissionDeadline: true,
        moduleId: true,
      },
    });

    if (!session) {
      throw new NotFoundException('Peer review session not found');
    }

    if (session.status !== PeerReviewStatus.SUBMISSION_OPEN) {
      throw new BadRequestException('Session is not open for submissions');
    }

    if (new Date() > session.submissionDeadline) {
      throw new BadRequestException('Submission deadline has passed');
    }

    // Check if FileUpload belongs to the current user
    const fileUpload = await this.prisma.fileUpload.findUnique({
      where: { id: createDto.fileUploadId },
      select: { 
        userId: true, 
        moduleId: true,
        peerSubmission: { select: { id: true } },
      },
    });

    if (!fileUpload) {
      throw new NotFoundException('File upload not found');
    }

    if (fileUpload.userId !== userId) {
      throw new ForbiddenException('You can only submit your own files');
    }

    if (fileUpload.moduleId !== session.moduleId) {
      throw new BadRequestException('File upload must be from the same module as the session');
    }

    if (fileUpload.peerSubmission) {
      throw new BadRequestException('This file has already been submitted to a peer review');
    }

    // Check if user has already submitted to this session
    const existingSubmission = await this.prisma.peerSubmission.findFirst({
      where: {
        sessionId: createDto.sessionId,
        fileUpload: { userId },
      },
    });

    if (existingSubmission) {
      throw new BadRequestException('You have already submitted to this session');
    }

    const submission = await this.prisma.peerSubmission.create({
      data: {
        sessionId: createDto.sessionId,
        fileUploadId: createDto.fileUploadId,
        title: createDto.title,
        description: createDto.description,
      },
      include: {
        session: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
        fileUpload: {
          include: {
            file: {
              select: {
                id: true,
                name: true,
                path: true,
                type: true,
                uniqueIdentifier: true,
              },
            },
            user: {
              select: {
                id: true,
                firstname: true,
                lastname: true,
              },
            },
          },
        },
      },
    });

    return this.mapToDTO(submission, userId);
  }

  async getSubmission(submissionId: string, userId: number): Promise<PeerSubmissionDTO> {
    const submission = await this.prisma.peerSubmission.findUnique({
      where: { id: submissionId },
      include: {
        session: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
        fileUpload: {
          include: {
            file: {
              select: {
                id: true,
                name: true,
                path: true,
                type: true,
                uniqueIdentifier: true,
              },
            },
            user: {
              select: {
                id: true,
                firstname: true,
                lastname: true,
              },
            },
          },
        },
        reviews: {
          include: {
            anonymousReviewer: {
              select: {
                id: true,
                anonymousName: true,
              },
            },
          },
        },
        discussions: {
          select: {
            id: true,
            title: true,
            createdAt: true,
            messages: { select: { id: true } },
          },
        },
      },
    });

    if (!submission) {
      throw new NotFoundException('Peer submission not found');
    }

    return this.mapToDTO(submission, userId);
  }

  async getSubmissionsBySession(sessionId: string, userId: number): Promise<PeerSubmissionDTO[]> {
    const submissions = await this.prisma.peerSubmission.findMany({
      where: { sessionId },
      include: {
        session: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
        fileUpload: {
          include: {
            file: {
              select: {
                id: true,
                name: true,
                path: true,
                type: true,
                uniqueIdentifier: true,
              },
            },
            user: {
              select: {
                id: true,
                firstname: true,
                lastname: true,
              },
            },
          },
        },
        reviews: {
          include: {
            anonymousReviewer: {
              select: {
                id: true,
                anonymousName: true,
              },
            },
          },
        },
        discussions: {
          select: {
            id: true,
            title: true,
            createdAt: true,
            messages: { select: { id: true } },
          },
        },
      },
      orderBy: {
        submittedAt: 'desc',
      },
    });

    return submissions.map(submission => this.mapToDTO(submission, userId));
  }

  async getUserSubmissions(userId: number): Promise<PeerSubmissionDTO[]> {
    const submissions = await this.prisma.peerSubmission.findMany({
      where: {
        fileUpload: { userId },
      },
      include: {
        session: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
        fileUpload: {
          include: {
            file: {
              select: {
                id: true,
                name: true,
                path: true,
                type: true,
                uniqueIdentifier: true,
              },
            },
            user: {
              select: {
                id: true,
                firstname: true,
                lastname: true,
              },
            },
          },
        },
        reviews: {
          include: {
            anonymousReviewer: {
              select: {
                id: true,
                anonymousName: true,
              },
            },
          },
        },
        discussions: {
          select: {
            id: true,
            title: true,
            createdAt: true,
            messages: { select: { id: true } },
          },
        },
      },
      orderBy: {
        submittedAt: 'desc',
      },
    });

    return submissions.map(submission => this.mapToDTO(submission, userId));
  }

  async updateSubmission(
    submissionId: string,
    updateDto: UpdatePeerSubmissionDTO,
    userId: number
  ): Promise<PeerSubmissionDTO> {
    const submission = await this.prisma.peerSubmission.findUnique({
      where: { id: submissionId },
      include: {
        session: { select: { status: true, submissionDeadline: true } },
        fileUpload: { select: { userId: true } },
      },
    });

    if (!submission) {
      throw new NotFoundException('Peer submission not found');
    }

    if (submission.fileUpload.userId !== userId) {
      throw new ForbiddenException('You can only update your own submissions');
    }

    if (submission.session.status !== PeerReviewStatus.SUBMISSION_OPEN) {
      throw new BadRequestException('Cannot update submission - session is not open for submissions');
    }

    if (new Date() > submission.session.submissionDeadline) {
      throw new BadRequestException('Cannot update submission - deadline has passed');
    }

    const updatedSubmission = await this.prisma.peerSubmission.update({
      where: { id: submissionId },
      data: updateDto,
      include: {
        session: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
        fileUpload: {
          include: {
            file: {
              select: {
                id: true,
                name: true,
                path: true,
                type: true,
                uniqueIdentifier: true,
              },
            },
            user: {
              select: {
                id: true,
                firstname: true,
                lastname: true,
              },
            },
          },
        },
        reviews: {
          include: {
            anonymousReviewer: {
              select: {
                id: true,
                anonymousName: true,
              },
            },
          },
        },
        discussions: {
          select: {
            id: true,
            title: true,
            createdAt: true,
            messages: { select: { id: true } },
          },
        },
      },
    });

    return this.mapToDTO(updatedSubmission, userId);
  }

  async deleteSubmission(submissionId: string, userId: number): Promise<void> {
    const submission = await this.prisma.peerSubmission.findUnique({
      where: { id: submissionId },
      include: {
        session: { select: { status: true } },
        fileUpload: { select: { userId: true } },
        reviews: { select: { id: true } },
      },
    });

    if (!submission) {
      throw new NotFoundException('Peer submission not found');
    }

    if (submission.fileUpload.userId !== userId) {
      throw new ForbiddenException('You can only delete your own submissions');
    }

    if (submission.session.status !== PeerReviewStatus.SUBMISSION_OPEN) {
      throw new BadRequestException('Cannot delete submission - session is not open for submissions');
    }

    if (submission.reviews.length > 0) {
      throw new BadRequestException('Cannot delete submission - it has already been reviewed');
    }

    await this.prisma.peerSubmission.delete({
      where: { id: submissionId },
    });
  }

  private mapToDTO(submission: any, currentUserId: number): PeerSubmissionDTO {
    const reviews = submission.reviews || [];
    const discussions = submission.discussions || [];
    
    const averageRating = reviews.length > 0 
      ? reviews.filter(r => r.rating).reduce((sum, r) => sum + r.rating, 0) / reviews.filter(r => r.rating).length
      : undefined;

    const userHasReviewed = reviews.some(r => r.reviewerId === currentUserId);
    const isOwnSubmission = submission.fileUpload.userId === currentUserId;

    return {
      id: submission.id,
      sessionId: submission.sessionId,
      fileUploadId: submission.fileUploadId,
      title: submission.title,
      description: submission.description,
      submittedAt: submission.submittedAt,
      session: submission.session,
      fileUpload: submission.fileUpload,
      reviews: reviews,
      discussions: discussions.map(d => ({
        id: d.id,
        title: d.title,
        createdAt: d.createdAt,
        messagesCount: d.messages?.length || 0,
      })),
      averageRating,
      reviewCount: reviews.length,
      isOwnSubmission,
      userHasReviewed,
    };
  }
}