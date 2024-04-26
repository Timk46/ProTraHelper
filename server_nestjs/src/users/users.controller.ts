import {
  Body,
  Controller,
  Post,
  Req
} from '@nestjs/common';
import { UsersService } from './users.service';
import { Public } from '@/public.decorator';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}
 // currently all login logic is done in the auth.controller.ts and auth.service.ts with CAS


 /** Aus Sicherheitsgründen erst mal entfernt. Kann hilfreich sein, wenn wir nachträglich viele Probanden mit einem einfachen Python Script hinzufügen wollen.
 @Public()
 @Post()
 createUser(
   @Body('email') email: string,
   @Body('firstName') firstName: string,
   @Body('lastName') lastName: string,
   @Body('password') password: string,
 ) {
   return this.usersService.createUser(email, firstName, lastName, password);
 }
 */
}

