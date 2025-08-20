import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { RolesGuard, roles } from '@/auth/common/guards/roles.guard';
import { JwtAuthGuard } from '@/auth/common/guards/jwt-auth.guard';
import { GroupReviewSessionService } from './group-review-session.service';
import { CreateGroupReviewSessionsDTO, GroupReviewGateStatusDTO, CreateGroupReviewSessionsResultDTO } from '@DTOs/index';
import { GetUser } from '@/auth/common/decorators/get-user.decorator';
import { User } from '@prisma/client';

@Controller('lecturers/group-review-sessions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class GroupReviewSessionController {
  constructor(private readonly sessionService: GroupReviewSessionService) {}

  @Get()
  @roles('LECTURER', 'ADMIN')
  async getGroupReviewGateStatuses(): Promise<GroupReviewGateStatusDTO[]> {
    return this.sessionService.getGroupReviewGateStatuses();
  }

  @Post()
  @roles('LECTURER', 'ADMIN')
  async createSessions(
    @Body() dto: CreateGroupReviewSessionsDTO,
    @GetUser() user: User,
  ): Promise<CreateGroupReviewSessionsResultDTO> {
    return this.sessionService.createSessionsForGates(dto, user.id);
  }
}
