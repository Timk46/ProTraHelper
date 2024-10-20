import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { UsersService } from '../users/users.service';
import { RolesGuard, roles } from '../auth/roles.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@roles('ADMIN')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly usersService: UsersService
  ) {}

  @roles('ADMIN')
  @Get('users')
  async getAllUsers() {
    return this.adminService.getAllUsers();
  }

  @roles('ADMIN')
  @Get('users/:userId/progress')
  async getUserTotalProgress(@Param('userId') userId: string) {
    return this.usersService.getUserTotalProgress(+userId);
  }

  @roles('ADMIN')
  @Get('users/:userId/progress-by-question-type')
  async getUserProgressByQuestionType(@Param('userId') userId: string) {
    return this.adminService.getUserProgressByQuestionType(+userId);
  }

  @roles('ADMIN')
  @Get('users/:userId/daily-progress')
  async getUserDailyProgress(@Param('userId') userId: string) {
    return this.adminService.getUserDailyProgress(+userId);
  }

  @roles('ADMIN')
  @Get('all-users-daily-progress')
  async getAllUsersDailyProgress() {
    return this.adminService.getAllUsersDailyProgress();
  }

  @roles('ADMIN')
  @Get('users/:userId/details')
  async getUserDetails(@Param('userId') userId: string) {
    return this.adminService.getUserDetails(+userId);
  }

  @roles('ADMIN')
  @Patch('users/:userId/subjects/:subjectId')
  async toggleRegisteredForSL(
    @Param('userId') userId: string,
    @Param('subjectId') subjectId: string,
    @Body('registeredForSL') registeredForSL: boolean,
  ) {
    return this.adminService.toggleRegisteredForSL(+userId, +subjectId, registeredForSL);
  }

  @roles('ADMIN')
  @Get('subjects')
  async getSubjects() {
    return this.adminService.getSubjects();
  }

  @roles('ADMIN')
  @Post('process-emails')
  async processEmailsForSubject(
    @Body('emails') emails: string[],
    @Body('subjectId') subjectId: number,
  ) {
    return this.adminService.processEmailsForSubject(emails, subjectId);
  }
}
