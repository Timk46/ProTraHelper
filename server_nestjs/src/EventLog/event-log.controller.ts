import { Controller, Post, Body, Req } from '@nestjs/common';
import { EventLogService } from './event-log.service';

@Controller('event-log')
export class EventLogController {
  constructor(private readonly eventLogService: EventLogService) {}

  /**
   * Endpoint to log an event. The user id is extracted from the request object.
   * @param level The logging level (e.g., info, warn, error).
   * @param type The type of the event (e.g., error, info, trace).
   * @param message The log message description.
   * @param data Optional additional data related to the event.
   * @param req Express request object to extract user id.
   */
  @Post()
  async logEvent(
    @Body('level') level: string,
    @Body('type') type: string,
    @Body('message') message: string,
    @Body('data') data: any,
    @Req() req
  ): Promise<void> {
    await this.eventLogService.log(level, type, req.user.id, message, data);
  }
}
