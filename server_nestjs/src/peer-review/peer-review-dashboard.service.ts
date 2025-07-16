import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { PeerReviewDashboardDTO } from '../../../shared/dtos/peer-review.dto';
import type { PeerReviewSessionDTO } from '../../../shared/dtos/peer-review-session.dto';
import { PeerReviewStatus } from '../../../shared/dtos/peer-review-session.dto';

@Injectable()
export class PeerReviewDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(userId: number): Promise<PeerReviewDashboardDTO> {
    // Get user's module access
    const userSubjects = await this.prisma.userSubject.findMany({
      where: { userId },
      include: {
        subject: {
          include: {
            modules: {
              include: {
                peerReviewSessions: {
                  where: {
                    status: {
                      in: [
                        PeerReviewStatus.SUBMISSION_OPEN,
                        PeerReviewStatus.REVIEW_OPEN,
                        PeerReviewStatus.DISCUSSION_OPEN,
                      ],
                    },
                  },
                  select: {
                    id: true,
                    title: true,
                    status: true,
                    submissionDeadline: true,
                    reviewDeadline: true,
                    discussionDeadline: true,
                    createdAt: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // Flatten active sessions
    const activeSessions = userSubjects.flatMap(us =>
      us.subject.modules.flatMap(m => m.peerReviewSessions),
    );

    // Get user's submissions
    const mySubmissions = await this.prisma.peerSubmission.findMany({
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
      },
      orderBy: {
        submittedAt: 'desc',
      },
    });

    // Get reviews assigned to current user (all submissions they need to review)
    const assignedReviews = await this.prisma.peerReview.findMany({
      where: {
        reviewerId: userId,
        isComplete: false,
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

    // Get completed reviews by current user
    const completedReviews = await this.prisma.peerReview.findMany({
      where: {
        reviewerId: userId,
        isComplete: true,
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
        anonymousReviewer: {
          select: {
            id: true,
            anonymousName: true,
          },
        },
      },
      orderBy: {
        completedAt: 'desc',
      },
    });

    // Calculate statistics
    const totalReviewsCompleted = completedReviews.length;
    const totalReviewsAssigned = assignedReviews.length + completedReviews.length;

    // Average rating received on user's submissions
    const reviewsOnMySubmissions = mySubmissions.flatMap(s => s.reviews);
    const ratingsReceived = reviewsOnMySubmissions.filter(r => r.rating);
    const averageRatingReceived =
      ratingsReceived.length > 0
        ? ratingsReceived.reduce((sum, r) => sum + r.rating!, 0) / ratingsReceived.length
        : undefined;

    // Average rating given by user
    const ratingsGiven = completedReviews.filter(r => r.rating);
    const averageRatingGiven =
      ratingsGiven.length > 0
        ? ratingsGiven.reduce((sum, r) => sum + r.rating!, 0) / ratingsGiven.length
        : undefined;

    // Count overdue reviews
    const now = new Date();
    const overdueReviews = assignedReviews.filter(r => {
      const session = r.session;
      // Check if review deadline has passed and session is still in review phase
      return (
        session.status === PeerReviewStatus.REVIEW_OPEN &&
        new Date(r.createdAt).getTime() + 7 * 24 * 60 * 60 * 1000 < now.getTime()
      ); // 7 days to complete
    }).length;

    return {
      activeSessions: activeSessions.map(
        session =>
          ({
            ...session,
            status: session.status,
          } as PeerReviewSessionDTO),
      ),
      mySubmissions: mySubmissions.map(submission => ({
        id: submission.id,
        sessionId: submission.sessionId,
        fileUploadId: submission.fileUploadId,
        title: submission.title,
        description: submission.description,
        submittedAt: submission.submittedAt,
        session: submission.session,
        fileUpload: submission.fileUpload,
        reviews: submission.reviews,
        averageRating:
          submission.reviews.length > 0
            ? submission.reviews.filter(r => r.rating).reduce((sum, r) => sum + r.rating!, 0) /
              submission.reviews.filter(r => r.rating).length
            : undefined,
        reviewCount: submission.reviews.length,
        isOwnSubmission: true,
        userHasReviewed: false,
      })),
      assignedReviews: assignedReviews.map(review => ({
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
        anonymousReviewer: review.anonymousReviewer,
        isOwnReview: true,
        canEdit: true,
      })),
      completedReviews: completedReviews.map(review => ({
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
        anonymousReviewer: review.anonymousReviewer,
        isOwnReview: true,
        canEdit: false,
      })),
      stats: {
        totalReviewsCompleted,
        totalReviewsAssigned,
        averageRatingReceived,
        averageRatingGiven,
        pendingReviews: assignedReviews.length,
        overdueReviews,
        newDiscussions: 0, // TODO: Implement discussion counting
      },
    };
  }
}
