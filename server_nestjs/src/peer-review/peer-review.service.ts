import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { 
  CreatePeerReviewDTO, 
  UpdatePeerReviewDTO, 
  PeerReviewDTO 
} from '../../../shared/dtos/peer-review.dto';
import { PeerReviewStatus } from '../../../shared/dtos/peer-review-session.dto';

@Injectable()
export class PeerReviewService {
  constructor(private prisma: PrismaService) {}

  async createReview(
    createDto: CreatePeerReviewDTO,
    userId: number
  ): Promise<PeerReviewDTO> {
    // Check if session exists and is in review phase
    const session = await this.prisma.peerReviewSession.findUnique({
      where: { id: createDto.sessionId },
      select: { 
        status: true, 
        reviewDeadline: true,
        moduleId: true,
      },
    });

    if (!session) {
      throw new NotFoundException('Peer review session not found');
    }

    if (session.status !== PeerReviewStatus.REVIEW_OPEN) {
      throw new BadRequestException('Session is not open for reviews');
    }

    if (new Date() > session.reviewDeadline) {
      throw new BadRequestException('Review deadline has passed');
    }

    // Check if submission exists
    const submission = await this.prisma.peerSubmission.findUnique({
      where: { id: createDto.submissionId },
      include: {
        fileUpload: { select: { userId: true } },
      },
    });

    if (!submission) {
      throw new NotFoundException('Peer submission not found');
    }

    // Check if user is not reviewing their own submission
    if (submission.fileUpload.userId === userId) {
      throw new BadRequestException('You cannot review your own submission');
    }

    // Check if user has already reviewed this submission
    const existingReview = await this.prisma.peerReview.findUnique({
      where: {
        sessionId_submissionId_reviewerId: {
          sessionId: createDto.sessionId,
          submissionId: createDto.submissionId,
          reviewerId: userId,
        },
      },
    });

    if (existingReview) {
      throw new BadRequestException('You have already reviewed this submission');
    }

    // Create or find anonymous reviewer
    const anonymousReviewer = await this.findOrCreateAnonymousUser(userId);

    const review = await this.prisma.peerReview.create({
      data: {
        sessionId: createDto.sessionId,
        submissionId: createDto.submissionId,
        reviewerId: userId,
        anonymousReviewerId: anonymousReviewer.id,
        rating: createDto.rating,
        comment: createDto.comment,
        isComplete: createDto.isComplete || false,
        completedAt: createDto.isComplete ? new Date() : null,
      },
      include: {
        session: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
        submission: {
          select: {
            id: true,
            title: true,
            description: true,
            fileUpload: {
              select: {
                file: {
                  select: {
                    id: true,
                    name: true,
                    path: true,
                    type: true,
                    uniqueIdentifier: true,
                  },
                },
              },
            },
          },
        },
        reviewer: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
          },
        },
        anonymousReviewer: {
          select: {
            id: true,
            anonymousName: true,
          },
        },
      },
    });

    return this.mapToDTO(review, userId);
  }

  async getReview(reviewId: string, userId: number): Promise<PeerReviewDTO> {
    const review = await this.prisma.peerReview.findUnique({
      where: { id: reviewId },
      include: {
        session: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
        submission: {
          select: {
            id: true,
            title: true,
            description: true,
            fileUpload: {
              select: {
                file: {
                  select: {
                    id: true,
                    name: true,
                    path: true,
                    type: true,
                    uniqueIdentifier: true,
                  },
                },
              },
            },
          },
        },
        reviewer: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
          },
        },
        anonymousReviewer: {
          select: {
            id: true,
            anonymousName: true,
          },
        },
      },
    });

    if (!review) {
      throw new NotFoundException('Peer review not found');
    }

    return this.mapToDTO(review, userId);
  }

  async getReviewsBySession(sessionId: string, userId: number): Promise<PeerReviewDTO[]> {
    const reviews = await this.prisma.peerReview.findMany({
      where: { sessionId },
      include: {
        session: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
        submission: {
          select: {
            id: true,
            title: true,
            description: true,
            fileUpload: {
              select: {
                file: {
                  select: {
                    id: true,
                    name: true,
                    path: true,
                    type: true,
                    uniqueIdentifier: true,
                  },
                },
              },
            },
          },
        },
        reviewer: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
          },
        },
        anonymousReviewer: {
          select: {
            id: true,
            anonymousName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return reviews.map(review => this.mapToDTO(review, userId));
  }

  async getReviewsBySubmission(submissionId: string, userId: number): Promise<PeerReviewDTO[]> {
    const reviews = await this.prisma.peerReview.findMany({
      where: { submissionId },
      include: {
        session: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
        submission: {
          select: {
            id: true,
            title: true,
            description: true,
            fileUpload: {
              select: {
                file: {
                  select: {
                    id: true,
                    name: true,
                    path: true,
                    type: true,
                    uniqueIdentifier: true,
                  },
                },
              },
            },
          },
        },
        reviewer: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
          },
        },
        anonymousReviewer: {
          select: {
            id: true,
            anonymousName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return reviews.map(review => this.mapToDTO(review, userId));
  }

  async getUserReviews(userId: number): Promise<PeerReviewDTO[]> {
    const reviews = await this.prisma.peerReview.findMany({
      where: { reviewerId: userId },
      include: {
        session: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
        submission: {
          select: {
            id: true,
            title: true,
            description: true,
            fileUpload: {
              select: {
                file: {
                  select: {
                    id: true,
                    name: true,
                    path: true,
                    type: true,
                    uniqueIdentifier: true,
                  },
                },
              },
            },
          },
        },
        reviewer: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
          },
        },
        anonymousReviewer: {
          select: {
            id: true,
            anonymousName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return reviews.map(review => this.mapToDTO(review, userId));
  }

  async updateReview(
    reviewId: string,
    updateDto: UpdatePeerReviewDTO,
    userId: number
  ): Promise<PeerReviewDTO> {
    const review = await this.prisma.peerReview.findUnique({
      where: { id: reviewId },
      include: {
        session: { select: { status: true, reviewDeadline: true } },
      },
    });

    if (!review) {
      throw new NotFoundException('Peer review not found');
    }

    if (review.reviewerId !== userId) {
      throw new ForbiddenException('You can only update your own reviews');
    }

    if (review.session.status !== PeerReviewStatus.REVIEW_OPEN) {
      throw new BadRequestException('Cannot update review - session is not open for reviews');
    }

    if (new Date() > review.session.reviewDeadline) {
      throw new BadRequestException('Cannot update review - deadline has passed');
    }

    const updatedReview = await this.prisma.peerReview.update({
      where: { id: reviewId },
      data: {
        rating: updateDto.rating,
        comment: updateDto.comment,
        isComplete: updateDto.isComplete,
        completedAt: updateDto.isComplete ? new Date() : review.completedAt,
      },
      include: {
        session: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
        submission: {
          select: {
            id: true,
            title: true,
            description: true,
            fileUpload: {
              select: {
                file: {
                  select: {
                    id: true,
                    name: true,
                    path: true,
                    type: true,
                    uniqueIdentifier: true,
                  },
                },
              },
            },
          },
        },
        reviewer: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
          },
        },
        anonymousReviewer: {
          select: {
            id: true,
            anonymousName: true,
          },
        },
      },
    });

    return this.mapToDTO(updatedReview, userId);
  }

  async deleteReview(reviewId: string, userId: number): Promise<void> {
    const review = await this.prisma.peerReview.findUnique({
      where: { id: reviewId },
      include: {
        session: { select: { status: true } },
      },
    });

    if (!review) {
      throw new NotFoundException('Peer review not found');
    }

    if (review.reviewerId !== userId) {
      throw new ForbiddenException('You can only delete your own reviews');
    }

    if (review.session.status !== PeerReviewStatus.REVIEW_OPEN) {
      throw new BadRequestException('Cannot delete review - session is not open for reviews');
    }

    await this.prisma.peerReview.delete({
      where: { id: reviewId },
    });
  }

  private async findOrCreateAnonymousUser(userId: number): Promise<any> {
    // Check if user already has an anonymous user
    let anonymousUser = await this.prisma.anonymousUser.findFirst({
      where: { userId },
    });

    if (!anonymousUser) {
      // Create new anonymous user
      anonymousUser = await this.prisma.anonymousUser.create({
        data: {
          userId,
          anonymousName: `Anonymous-${Math.random().toString(36).substring(2, 8)}`,
        },
      });
    }

    return anonymousUser;
  }

  private mapToDTO(review: any, currentUserId: number): PeerReviewDTO {
    const isOwnReview = review.reviewerId === currentUserId;
    const canEdit = isOwnReview && review.session.status === PeerReviewStatus.REVIEW_OPEN;

    return {
      id: review.id,
      sessionId: review.sessionId,
      submissionId: review.submissionId,
      reviewerId: review.reviewerId,
      anonymousReviewerId: review.anonymousReviewerId,
      rating: review.rating,
      comment: review.comment,
      isComplete: review.isComplete,
      completedAt: review.completedAt,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
      session: review.session,
      submission: review.submission,
      reviewer: review.reviewer,
      anonymousReviewer: review.anonymousReviewer,
      isOwnReview,
      canEdit,
    };
  }
}