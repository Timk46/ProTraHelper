import { Controller, Get, Param, Patch, Body, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { RolesGuard, roles } from '../auth/roles.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@roles('ADMIN')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  async getAllUsers() {
    return this.adminService.getAllUsers();
  }

  @Get('users/:userId/progress')
  async getUserTotalProgress(@Param('userId') userId: string) {
    return this.adminService.getUserTotalProgress(+userId);
  }

  @Patch('users/:userId/subjects/:subjectId')
  async toggleRegisteredForSL(
    @Param('userId') userId: string,
    @Param('subjectId') subjectId: string,
    @Body('registeredForSL') registeredForSL: boolean,
  ) {
    return this.adminService.toggleRegisteredForSL(+userId, +subjectId, registeredForSL);
  }
}
