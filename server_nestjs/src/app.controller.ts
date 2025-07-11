import { User } from '@prisma/client';
import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AppService } from './app.service';
import { RolesGuard, roles } from './auth/common/guards/roles.guard';
import { Public } from './public.decorator';
import { version } from '@DTOs/version';

@UseGuards(RolesGuard) // This guard is used for all routes in this controller. So you have to use the roles decorator for every route
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @roles('ANY') // ANY means all loggin in users. Our default (for all routes) jwt strategy will check if the user is logged in
  @Get('/testAuth/any')
  getANY(): string {
    return 'Role ANY worked';
  }

  @roles('STUDENT')
  @Get('/testAuth/student')
  getStudent(@Req() req): string {
    // Aways access user data like this. This is validated by the jwt strategy!
    return 'Role student worked for studentid' + req.user.id + ' and email ' + req.user.email;
  }

  @roles('ADMIN', 'TEACHER') // You can also use multiple roles
  @Get('/testAuth/adminteacher')
  getAdminteacher(@Req() req): string {
    return (
      'Route worked for admin or teacher. UserId:' +
      req.user.id +
      ' and email ' +
      req.user.email +
      ' and role ' +
      req.user.globalRole
    );
  }

  @roles('TEACHER')
  @Get('/testAuth/teacher')
  getTeacher(): string {
    return 'Role teacher worked';
  }

  @roles('ADMIN')
  @Get('/testAuth/admin')
  getAdmin(): string {
    return 'Role admin  worked';
  }

  @Public() // This route is public and can be accessed without being logged in
  @roles('NONE')
  @Get('/healthcheck')
  healthcheck(): string {
    return 'GOALS is up';
  }
}
