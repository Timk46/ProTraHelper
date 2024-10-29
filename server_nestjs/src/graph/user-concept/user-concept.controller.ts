import { RolesGuard, roles } from '@/auth/common/guards/roles.guard';
import { Body, Controller, Param, ParseIntPipe, Put, Req, UseGuards } from '@nestjs/common';
import { UserConceptService } from './user-concept.service';

@UseGuards(RolesGuard)
@Controller('user-concept')
export class UserConceptController {

    constructor(private userConceptService: UserConceptService) { }

    @roles("ANY")
    @Put(':conceptId/level/:level')
    async updateUserConceptLevel(@Req() req,
        @Param('conceptId', ParseIntPipe) conceptId: number,
        @Param('level', ParseIntPipe) level:number): Promise<any> {
        const userId = req.user.id;
        return await this.userConceptService.updateUserLevel(userId, conceptId, level);
    }

    @roles("ANY")
    @Put(':conceptId/expanded/:expanded')
    async updateUserConceptExpanded(@Req() req,
        @Param('conceptId', ParseIntPipe) conceptId: number,
        @Param('expanded') expandedString:string): Promise<any> {
        const userId = req.user.id;
        const expandedBoolean = expandedString === 'true';
        
        return await this.userConceptService.updateUserConceptExpansionState(userId, conceptId, expandedBoolean);
    }

    @roles("ANY")
    @Put('concept/:conceptId/selected')
    async updateUserConceptSelected(@Req() req,
        @Param('conceptId', ParseIntPipe) conceptId: number): Promise<any> {
        const userId = req.user.id;
        return await this.userConceptService.updateSelectedConcept(userId, conceptId);
    }
}
