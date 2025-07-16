import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type {
  CreatePeerReviewSessionDTO,
  UpdatePeerReviewSessionDTO,
  PeerReviewSessionDTO,
} from '../../../shared/dtos/peer-review-session.dto';
import { PeerReviewStatus } from '../../../shared/dtos/peer-review-session.dto';
import type { PeerReviewStatsDTO } from '../../../shared/dtos/peer-review.dto';

@Injectable()
export class PeerReviewSessionService {
  constructor(private readonly prisma: PrismaService) {}

  async createSession(
    createDto: CreatePeerReviewSessionDTO,
    userId: number,
  ): Promise<PeerReviewSessionDTO> {
    // Validate deadlines
    const submissionDeadline = new Date(createDto.submissionDeadline);
    const reviewDeadline = new Date(createDto.reviewDeadline);
    const discussionDeadline = new Date(createDto.discussionDeadline);
    const now = new Date();

    if (submissionDeadline <= now) {
      throw new BadRequestException('Submission deadline must be in the future');
    }
    if (reviewDeadline <= submissionDeadline) {
      throw new BadRequestException('Review deadline must be after submission deadline');
    }
    if (discussionDeadline <= reviewDeadline) {
      throw new BadRequestException('Discussion deadline must be after review deadline');
    }

    // Check if user has permission to create sessions in this module
    const userSubject = await this.prisma.userSubject.findFirst({
      where: {
        userId,
        subject: {
          modules: {
            some: { id: createDto.moduleId },
          },
        },
      },
    });

    if (!userSubject) {
      throw new ForbiddenException('You do not have permission to create sessions in this module');
    }

    const session = await this.prisma.peerReviewSession.create({
      data: {
        title: createDto.title,
        description: createDto.description,
        moduleId: createDto.moduleId,
        createdById: userId,
        submissionDeadline,
        reviewDeadline,
        discussionDeadline,
        status: PeerReviewStatus.CREATED,
      },
      include: {
        module: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
        creator: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
            email: true,
          },
        },
      },
    });

    return this.mapToDTO(session);
  }

  async getSession(sessionId: string): Promise<PeerReviewSessionDTO> {
    const session = await this.prisma.peerReviewSession.findUnique({
      where: { id: sessionId },
      include: {
        module: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
        creator: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
            email: true,
          },
        },
        submissions: {
          select: {
            id: true,
            title: true,
            submittedAt: true,
          },
        },
        reviews: {
          select: {
            id: true,
            isComplete: true,
            completedAt: true,
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Peer review session not found');
    }

    return this.mapToDTO(session);
  }

  async getSessionsByModule(moduleId: number): Promise<PeerReviewSessionDTO[]> {
    const sessions = await this.prisma.peerReviewSession.findMany({
      where: { moduleId },
      include: {
        module: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
        creator: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
            email: true,
          },
        },
        submissions: {
          select: {
            id: true,
            title: true,
            submittedAt: true,
          },
        },
        reviews: {
          select: {
            id: true,
            isComplete: true,
            completedAt: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return sessions.map(session => this.mapToDTO(session));
  }

  async updateSession(
    sessionId: string,
    updateDto: UpdatePeerReviewSessionDTO,
    userId: number,
  ): Promise<PeerReviewSessionDTO> {
    const session = await this.prisma.peerReviewSession.findUnique({
      where: { id: sessionId },
      select: { createdById: true, status: true },
    });

    if (!session) {
      throw new NotFoundException('Peer review session not found');
    }

    if (session.createdById !== userId) {
      throw new ForbiddenException('You can only update your own sessions');
    }

    // Validate status transitions
    if (
      updateDto.status &&
      !this.isValidStatusTransition(session.status as any, updateDto.status as any)
    ) {
      throw new BadRequestException(
        `Invalid status transition from ${session.status} to ${updateDto.status}`,
      );
    }

    const updatedSession = await this.prisma.peerReviewSession.update({
      where: { id: sessionId },
      data: updateDto,
      include: {
        module: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
        creator: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
            email: true,
          },
        },
      },
    });

    return this.mapToDTO(updatedSession);
  }

  async deleteSession(sessionId: string, userId: number): Promise<void> {
    const session = await this.prisma.peerReviewSession.findUnique({
      where: { id: sessionId },
      select: { createdById: true, status: true },
    });

    if (!session) {
      throw new NotFoundException('Peer review session not found');
    }

    if (session.createdById !== userId) {
      throw new ForbiddenException('You can only delete your own sessions');
    }

    if (session.status !== PeerReviewStatus.CREATED) {
      throw new BadRequestException("Can only delete sessions that haven't started");
    }

    await this.prisma.peerReviewSession.delete({
      where: { id: sessionId },
    });
  }

  async getSessionStats(sessionId: string): Promise<PeerReviewStatsDTO> {
    const session = await this.prisma.peerReviewSession.findUnique({
      where: { id: sessionId },
      include: {
        submissions: {
          include: {
            reviews: {
              include: {
                submission: true,
              },
            },
          },
        },
        reviews: {
          include: {
            submission: true,
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Peer review session not found');
    }

    const totalSubmissions = session.submissions.length;
    const totalReviews = session.reviews.length;
    const completedReviews = session.reviews.filter(r => r.isComplete).length;
    const averageReviewsPerSubmission = totalSubmissions > 0 ? totalReviews / totalSubmissions : 0;

    // Calculate rating statistics
    const completedReviewsWithRating = session.reviews.filter(r => r.isComplete && r.rating);
    const averageRating =
      completedReviewsWithRating.length > 0
        ? completedReviewsWithRating.reduce((sum, r) => sum + r.rating!, 0) /
          completedReviewsWithRating.length
        : 0;

    const ratingDistribution = {};
    completedReviewsWithRating.forEach(review => {
      const rating = review.rating!;
      ratingDistribution[rating] = (ratingDistribution[rating] || 0) + 1;
    });

    // Calculate timeline statistics
    const submissionTimeline = this.calculateTimeline(session.submissions.map(s => s.submittedAt));
    const reviewTimeline = this.calculateTimeline(
      session.reviews.filter(r => r.completedAt).map(r => r.completedAt!),
    );

    return {
      sessionId: session.id,
      totalSubmissions,
      submissionRate: 100, // Assuming all registered users should submit
      totalReviews,
      completedReviews,
      reviewCompletionRate: totalReviews > 0 ? (completedReviews / totalReviews) * 100 : 0,
      averageReviewsPerSubmission,
      averageRating,
      ratingDistribution,
      totalParticipants: totalSubmissions, // Simplified
      activeReviewers: new Set(session.reviews.map(r => r.reviewerId)).size,
      submissionTimeline,
      reviewTimeline,
      totalDiscussions: 0, // TODO: Implement discussion counting
      averageMessagesPerDiscussion: 0, // TODO: Implement
      activeDiscussions: 0, // TODO: Implement
    };
  }

  private mapToDTO(session: any): PeerReviewSessionDTO {
    return {
      id: session.id,
      title: session.title,
      description: session.description,
      moduleId: session.moduleId,
      createdById: session.createdById,
      submissionDeadline: session.submissionDeadline,
      reviewDeadline: session.reviewDeadline,
      discussionDeadline: session.discussionDeadline,
      status: session.status,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      module: session.module,
      creator: session.creator,
      submissions: session.submissions,
      submissionCount: session.submissions?.length || 0,
      completedReviewCount: session.reviews?.filter(r => r.isComplete).length || 0,
      totalReviewCount: session.reviews?.length || 0,
    };
  }

  private isValidStatusTransition(current: PeerReviewStatus, next: PeerReviewStatus): boolean {
    const validTransitions = {
      [PeerReviewStatus.CREATED]: [PeerReviewStatus.SUBMISSION_OPEN],
      [PeerReviewStatus.SUBMISSION_OPEN]: [PeerReviewStatus.SUBMISSION_CLOSED],
      [PeerReviewStatus.SUBMISSION_CLOSED]: [PeerReviewStatus.REVIEW_OPEN],
      [PeerReviewStatus.REVIEW_OPEN]: [PeerReviewStatus.REVIEW_CLOSED],
      [PeerReviewStatus.REVIEW_CLOSED]: [PeerReviewStatus.DISCUSSION_OPEN],
      [PeerReviewStatus.DISCUSSION_OPEN]: [PeerReviewStatus.DISCUSSION_CLOSED],
      [PeerReviewStatus.DISCUSSION_CLOSED]: [PeerReviewStatus.COMPLETED],
    };

    return validTransitions[current]?.includes(next) || false;
  }

  private calculateTimeline(dates: Date[]): { date: Date; count: number }[] {
    const timeline = new Map<string, number>();

    dates.forEach(date => {
      const dateKey = date.toISOString().split('T')[0];
      timeline.set(dateKey, (timeline.get(dateKey) || 0) + 1);
    });

    return Array.from(timeline.entries()).map(([dateStr, count]) => ({
      date: new Date(dateStr),
      count,
    }));
  }
}
