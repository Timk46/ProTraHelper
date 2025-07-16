import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/common/guards/jwt-auth.guard';
import { PeerReviewDashboardService } from './peer-review-dashboard.service';
import { PeerReviewDashboardDTO } from '../../../shared/dtos/peer-review.dto';

@Controller('peer-review/dashboard')
@UseGuards(JwtAuthGuard)
export class PeerReviewDashboardController {
  constructor(
    private readonly dashboardService: PeerReviewDashboardService
  ) {}

  @Get()
  async getDashboard(@Request() req: any): Promise<PeerReviewDashboardDTO> {
    return this.dashboardService.getDashboard(req.user.id);
  }
}