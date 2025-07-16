import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PeerReviewSessionController } from './peer-review-session.controller';
import { PeerReviewSessionService } from './peer-review-session.service';
import { PeerSubmissionController } from './peer-submission.controller';
import { PeerSubmissionService } from './peer-submission.service';
import { PeerReviewController } from './peer-review.controller';
import { PeerReviewService } from './peer-review.service';
import { PeerReviewDashboardController } from './peer-review-dashboard.controller';
import { PeerReviewDashboardService } from './peer-review-dashboard.service';

@Module({
  imports: [PrismaModule],
  controllers: [
    PeerReviewSessionController,
    PeerSubmissionController,
    PeerReviewController,
    PeerReviewDashboardController,
  ],
  providers: [
    PeerReviewSessionService,
    PeerSubmissionService,
    PeerReviewService,
    PeerReviewDashboardService,
  ],
  exports: [
    PeerReviewSessionService,
    PeerSubmissionService,
    PeerReviewService,
    PeerReviewDashboardService,
  ],
})
export class PeerReviewModule {}