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

  @Get('users')
  async getAllUsers() {
    return this.adminService.getAllUsers();
  }

  @Get('users/:userId/progress')
  async getUserTotalProgress(@Param('userId') userId: string) {
    return this.usersService.getUserTotalProgress(+userId);
  }

  @Patch('users/:userId/subjects/:subjectId')
  async toggleRegisteredForSL(
    @Param('userId') userId: string,
    @Param('subjectId') subjectId: string,
    @Body('registeredForSL') registeredForSL: boolean,
  ) {
    return this.adminService.toggleRegisteredForSL(+userId, +subjectId, registeredForSL);
  }

  @Get('subjects')
  async getSubjects() {
    return this.adminService.getSubjects();
  }

  @Post('process-emails')
  async processEmailsForSubject(
    @Body('emails') emails: string[],
    @Body('subjectId') subjectId: number,
  ) {
    return this.adminService.processEmailsForSubject(emails, subjectId);
  }
}
