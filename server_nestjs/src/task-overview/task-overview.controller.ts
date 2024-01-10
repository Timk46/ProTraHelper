import { Controller, Get, Param } from '@nestjs/common';
import { TaskOverviewService } from './task-overview.service';

@Controller('task-overview')
export class TaskOverviewController {
    constructor(private taskOverviewService : TaskOverviewService) {}

    @Get(':conceptNodeId')
    async getTaskIdsForConceptNode(@Param('conceptNodeId') conceptNodeId : number) {
        return this.taskOverviewService.getTaskIdsForConceptNode(conceptNodeId);
    }

    @Get('taskIdentitys/:conceptNodeId')
    async getTaskIdentityDataForConceptNode(@Param('conceptNodeId') conceptNodeId : number): Promise<{id: number, type: string}[]> {
        console.log('task-overview-controller: getTaskIdentityDataForConceptNode: conceptNodeId: ' + conceptNodeId);
        if (isNaN(conceptNodeId)) {
            throw new Error('conceptNodeId is not a number');
        }
        return this.taskOverviewService.getTaskIdentityDataForConceptNode(Number(conceptNodeId));
    }
}
