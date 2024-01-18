import { RolesGuard, roles } from '@/auth/roles.guard';
import { ModuleDTO } from '@Interfaces/module.dto';
import { Controller, Get, Param, ParseIntPipe, Req, UseGuards } from '@nestjs/common';
import { ModulesService } from './modules.service';

@UseGuards(RolesGuard)
@Controller('modules')
export class ModulesController {

    constructor(private modulesService: ModulesService) {}
    /**
     * This function returns a concept graph of a module with data about a user (the level)
     * @param userId the user id
     * @param moduleId the module id
     * @returns the concept graph
     */
    @roles("ANY")
    @Get()
    async getUserModules(@Req() req): 
    Promise<ModuleDTO[]>{
        const userId = req.user.id;
        const modules: ModuleDTO[] = await this.modulesService.getUserModules(userId);
        return modules;
    }
}
