import { Injectable, CanActivate, ExecutionContext, SetMetadata } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { Reflector } from '@nestjs/core';
import { User } from '@prisma/client';
import { globalRole } from '@DTOs/roles.enum';

export const roles = (...roles: string[]) => SetMetadata('roles', roles);

/**
 * This class is used to define the roles guard
 * It checks if the user has the required role to access a protected route
 */
@Injectable()
export class RolesGuard implements CanActivate {

  constructor(private reflector: Reflector, private prisma: PrismaService) {}

  /**
   * Checks if the user has the required role to access a protected route
   * @param {ExecutionContext} context the execution context
   * @returns true if the user has the required role, false otherwise
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // get the required roles
    // can be either 'STUDENT', 'TEACHER' or 'ADMIN' (case sensitive)
    // if role is given as 'none', everyone can access the route
    // if role is given as 'any' all logged in members can access the route
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      'roles',
      [context.getHandler(), context.getClass()],
  );
    if (!requiredRoles) {
      console.log(
        'No allowed global roles are set for this route. It is forbidden by default.',
      );
      return false;
    }

    if (requiredRoles.includes('NONE')) {
      console.log('No required roles');
      return true;
    }
    if (requiredRoles.includes('ANY')) {
      return true; // logged in members are controlled by the JwtAuthGuard
    }

    const request = context.switchToHttp().getRequest();

    const { user }: { user: User } = request;

    const globalRole = await this.getGlobalRole(user.id);

    if (requiredRoles.includes(globalRole)) {
      return true;
    }
    // else
    console.log('User: ' + user.email + ' has Role: ' + globalRole + ' but needs Role: ' + requiredRoles.toString());
    return false;
  }

  /**
   *
   * @param userId
   * @returns users global role
   */
  async getGlobalRole(userId: number): Promise<globalRole> {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
    });
    return user.globalRole as globalRole;
  }
}
