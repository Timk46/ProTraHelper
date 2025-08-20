import { Module } from '@nestjs/common';
import { GroupReviewSessionController } from './group-review-session.controller';
import { GroupReviewSessionService } from './group-review-session.service';
import { PrismaModule } from '@/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [GroupReviewSessionController],
  providers: [GroupReviewSessionService],
})
export class GroupReviewSessionModule {}
