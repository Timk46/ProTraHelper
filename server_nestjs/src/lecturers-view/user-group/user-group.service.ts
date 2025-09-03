import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { UserGroup, UserGroupMembership } from '@prisma/client';
import { CreateUserGroupDto } from './dto/userGroup.dto';
import { CreateUserGroupMembershipDto } from './dto/userGroupMembership.dto';
import { UserDTO, UserSubjectDTO } from '@DTOs/user.dto';

@Injectable()
export class UserGroupService {
  constructor(private readonly prisma: PrismaService) {}

  // UserGroup methods
  async createUserGroup(createUserGroupDto: CreateUserGroupDto): Promise<UserGroup> {
    try {
      return await this.prisma.userGroup.create({
        data: {
          name: createUserGroupDto.name,
          maxSize: createUserGroupDto.maxSize,
        },
      });
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ConflictException('A user group with this name already exists');
      }
      throw error;
    }
  }

  async getAllUserGroups(): Promise<UserGroup[]> {
    return await this.prisma.userGroup.findMany({
      include: {
        UserGroupMembership: {
          include: {
            user: {
              select: {
                id: true,
                firstname: true,
                lastname: true,
                email: true,
              },
            },
          },
        },
      },
    });
  }

  async getUserGroupById(id: number): Promise<UserGroup> {
    const userGroup = await this.prisma.userGroup.findUnique({
      where: { id },
      include: {
        UserGroupMembership: {
          include: {
            user: {
              select: {
                id: true,
                firstname: true,
                lastname: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!userGroup) {
      throw new NotFoundException(`User group with ID ${id} not found`);
    }

    return userGroup;
  }

  async deleteUserGroup(id: number): Promise<void> {
    try {
      await this.prisma.userGroup.delete({
        where: { id },
      });
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`User group with ID ${id} not found`);
      }
      throw error;
    }
  }

  async getAllUsers(): Promise<UserDTO[]> {
    const users = await this.prisma.user.findMany({
      include: {
        userSubjects: {
          include: {
            subject: true,
          },
        },
      },
    });
    return users.map(user => this.mapToUserDTO(user));
  }

  private mapToUserDTO(user: any): UserDTO {
    return {
      id: user.id,
      email: user.email,
      firstname: user.firstname,
      lastname: user.lastname,
      globalRole: user.globalRole,
      userSubjects: user.userSubjects
        ? user.userSubjects.map(userSubject => this.mapToUserSubjectDTO(userSubject))
        : [],
    };
  }

  private mapToUserSubjectDTO(userSubject: any): UserSubjectDTO {
    return {
      id: userSubject.id,
      name: userSubject.subject.name,
      userId: userSubject.userId,
      subjectId: userSubject.subjectId,
      subjectSpecificRole: userSubject.subjectSpecificRole,
      registeredForSL: userSubject.registeredForSL,
    };
  }

  // UserGroupMembership methods
  async createUserGroupMembership(
    createMembershipDto: CreateUserGroupMembershipDto,
  ): Promise<UserGroupMembership> {
    try {
      // Check if user and group exist
      const user = await this.prisma.user.findUnique({
        where: { id: createMembershipDto.userId },
      });

      if (!user) {
        throw new NotFoundException(`User with ID ${createMembershipDto.userId} not found`);
      }

      const group = await this.prisma.userGroup.findUnique({
        where: { id: createMembershipDto.groupId },
      });

      if (!group) {
        throw new NotFoundException(`User group with ID ${createMembershipDto.groupId} not found`);
      }

      return await this.prisma.userGroupMembership.create({
        data: {
          userId: createMembershipDto.userId,
          groupId: createMembershipDto.groupId,
        },
        include: {
          user: {
            select: {
              id: true,
              firstname: true,
              lastname: true,
              email: true,
            },
          },
          group: true,
        },
      });
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ConflictException('User is already a member of this group');
      }
      throw error;
    }
  }

  async getUserGroupMemberships(groupId: number): Promise<UserGroupMembership[]> {
    const group = await this.prisma.userGroup.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      throw new NotFoundException(`User group with ID ${groupId} not found`);
    }

    return await this.prisma.userGroupMembership.findMany({
      where: { groupId },
      include: {
        user: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
            email: true,
          },
        },
        group: true,
      },
    });
  }

  async deleteUserGroupMembership(userId: number, groupId: number): Promise<void> {
    try {
      await this.prisma.userGroupMembership.delete({
        where: {
          userId_groupId: {
            userId,
            groupId,
          },
        },
      });
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Membership for user ${userId} in group ${groupId} not found`);
      }
      throw error;
    }
  }

  async deleteUserGroupMembershipById(id: number): Promise<void> {
    try {
      await this.prisma.userGroupMembership.delete({
        where: { id },
      });
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Membership with ID ${id} not found`);
      }
      throw error;
    }
  }
}
