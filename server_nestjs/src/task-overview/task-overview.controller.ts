import { Controller, Get, Param } from '@nestjs/common';
import { TaskOverviewService } from './task-overview.service';

@Controller('task-overview')
export class TaskOverviewController {
    constructor(private taskOverviewService : TaskOverviewService) {}

    @Get(':conceptNodeId')
    async getTaskIdsForConceptNode(@Param('conceptNodeId') conceptNodeId : number) {
        return this.taskOverviewService.getTaskIdsForConceptNode(conceptNodeId);
    }
}
