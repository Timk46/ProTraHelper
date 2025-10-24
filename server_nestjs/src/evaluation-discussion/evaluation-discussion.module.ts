import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationModule } from '../notification/notification.module';
import { FilesModule } from '../files/files.module';

// Controllers
import { EvaluationSessionController } from './evaluation-session/evaluation-session.controller';
import { EvaluationSubmissionController } from './evaluation-submission/evaluation-submission.controller';
import { EvaluationCommentController } from './evaluation-comment/evaluation-comment.controller';
import { EvaluationRatingController } from './evaluation-rating/evaluation-rating.controller';

// Services
import { EvaluationSessionService } from './evaluation-session/evaluation-session.service';
import { EvaluationSubmissionService } from './evaluation-submission/evaluation-submission.service';
import { EvaluationCommentService } from './evaluation-comment/evaluation-comment.service';
import { EvaluationRatingService } from './evaluation-rating/evaluation-rating.service';

// Shared Services
import { EvaluationCacheService } from './shared/evaluation-cache.service';
import { EvaluationUtilsService } from './shared/evaluation-utils.service';
import { EvaluationAuthorizationService } from './evaluation-authorization.service';

// Guards
import { SubmissionAuthorizationGuard } from './guards/submission-authorization.guard';

@Module({
  imports: [PrismaModule, NotificationModule, FilesModule],
  controllers: [
    EvaluationSessionController,
    EvaluationSubmissionController,
    EvaluationCommentController,
    EvaluationRatingController,
  ],
  providers: [
    EvaluationSessionService,
    EvaluationSubmissionService,
    EvaluationCommentService,
    EvaluationRatingService,
    // Shared Services
    EvaluationCacheService,
    EvaluationUtilsService,
    EvaluationAuthorizationService,
    // Guards
    SubmissionAuthorizationGuard,
  ],
  exports: [
    EvaluationSessionService,
    EvaluationSubmissionService,
    EvaluationCommentService,
    EvaluationRatingService,
    // Shared Services
    EvaluationCacheService,
    EvaluationUtilsService,
    EvaluationAuthorizationService,
  ],
})
export class EvaluationDiscussionModule {}
