import { Controller, Get, UseGuards } from '@nestjs/common';
import { roles, RolesGuard } from '../auth/common/guards/roles.guard';
import { ModuleDTO } from '../../../shared/dtos';
import { UserModuleService } from './userModule.service';

@UseGuards(RolesGuard)
@Controller('userModules')
export class UserModuleController {
  constructor(private readonly userModuleService: UserModuleService) {}

  @roles('ANY')
  @Get('/all')
  async getAllUserModules(): Promise<ModuleDTO[]> {
    return this.userModuleService.getAllUserModules();
  }
}
