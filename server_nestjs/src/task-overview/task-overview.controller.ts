import { Controller, Get, Param, Req } from '@nestjs/common';
import { TaskOverviewService } from './task-overview.service';
import { taskOverviewElementDTO } from '@DTOs/taskOverview.dto';

@Controller('task-overview')
export class TaskOverviewController {
    constructor(private taskOverviewService : TaskOverviewService) {}

    @Get(':questionId')
    async getTaskOverviewData(@Param('questionId') questionId : number, @Req() req: any): Promise<taskOverviewElementDTO> {
        console.log('task-overview-controller: getTaskOverviewData: questionId: ' + questionId);
        if (isNaN(questionId)) {
            throw new Error('questionId is not a number');
        }
        return this.taskOverviewService.getTaskOverviewData(Number(questionId), req.user.id);
    }
}