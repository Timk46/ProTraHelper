import { Controller, Get, Post, Delete,Param, Body, Req, UseGuards, ParseIntPipe, HttpCode, HttpStatus} from '@nestjs/common';
import { roles, RolesGuard } from '@/auth/common/guards/roles.guard';
import { UserGroupService } from './user-group.service';
import { CreateUserGroupDto } from './dto/userGroup.dto';
import { UserGroup, UserGroupMembership } from '@prisma/client';
import { CreateUserGroupMembershipDto } from './dto/userGroupMembership.dto';

@UseGuards(RolesGuard)
@Controller('user-group')
export class UserGroupController {
  constructor(private readonly userGroupService: UserGroupService) {}

  // UserGroup endpoints
  @Post()
  @roles('LECTURER', 'ADMIN')
  async createUserGroup(@Body() createUserGroupDto: CreateUserGroupDto): Promise<UserGroup> {
    return this.userGroupService.createUserGroup(createUserGroupDto);
  }

  @Get()
  @roles('LECTURER', 'ADMIN')
  async getAllUserGroups(): Promise<UserGroup[]> {
    return this.userGroupService.getAllUserGroups();
  }

  @Get(':id')
  @roles('LECTURER', 'ADMIN')
  async getUserGroupById(@Param('id', ParseIntPipe) id: number): Promise<UserGroup> {
    return this.userGroupService.getUserGroupById(id);
  }

  @Delete(':id')
  @roles('LECTURER', 'ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteUserGroup(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.userGroupService.deleteUserGroup(id);
  }

  // UserGroupMembership endpoints
  @Post('membership')
  @roles('LECTURER', 'ADMIN')
  async createUserGroupMembership(
    @Body() createMembershipDto: CreateUserGroupMembershipDto
  ): Promise<UserGroupMembership> {
    return this.userGroupService.createUserGroupMembership(createMembershipDto);
  }

  @Get(':groupId/memberships')
  @roles('LECTURER', 'ADMIN')
  async getUserGroupMemberships(
    @Param('groupId', ParseIntPipe) groupId: number
  ): Promise<UserGroupMembership[]> {
    return this.userGroupService.getUserGroupMemberships(groupId);
  }

  @Delete('membership/:id')
  @roles('LECTURER', 'ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteUserGroupMembershipById(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.userGroupService.deleteUserGroupMembershipById(id);
  }

  @Delete('membership/user/:userId/group/:groupId')
  @roles('LECTURER', 'ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteUserGroupMembership(
    @Param('userId', ParseIntPipe) userId: number,
    @Param('groupId', ParseIntPipe) groupId: number
  ): Promise<void> {
    return this.userGroupService.deleteUserGroupMembership(userId, groupId);
  }
}
