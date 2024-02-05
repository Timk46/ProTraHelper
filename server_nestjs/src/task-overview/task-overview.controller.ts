import { Controller, Get, Param, Req } from '@nestjs/common';
import { TaskOverviewService } from './task-overview.service';
import { taskOverviewElementDTO } from '@DTOs/taskOverview.dto';

@Controller('task-overview')
export class TaskOverviewController {
    constructor(private taskOverviewService : TaskOverviewService) {}

    @Get(':conceptNodeId')
    async getTaskIdentityDataForConceptNode(@Param('conceptNodeId') conceptNodeId : number, @Req() req: any): Promise<taskOverviewElementDTO[]> {
        console.log('task-overview-controller: getTaskIdentityDataForConceptNode: conceptNodeId: ' + conceptNodeId);
        if (isNaN(conceptNodeId)) {
            throw new Error('conceptNodeId is not a number');
        }
        return this.taskOverviewService.getTaskOverviewDataForConceptNode(Number(conceptNodeId), req.user.id);
    }
}