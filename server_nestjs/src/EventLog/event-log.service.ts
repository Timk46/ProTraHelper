import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
//import { PinoLogger } from 'nestjs-pino';

@Injectable()
export class EventLogService {

  constructor
  (
    private prisma: PrismaService,
    //private logger: PinoLogger
  ) {}

  /**
   * Logs an event with given parameters, storing in the database and forwarding to the external logger.
   * @param level {string} The logging level (e.g., info, warn, error).
   * @param type {string} The type of the event (e.g., error, info, trace).
   * @param user {number} The user ID associated with the event.
   * @param message {string} The log message description.
   * @param data {any} Optional additional data related to the event.
   * @returns {Promise<void>} A promise that resolves when the log is stored and logged externally.
   */
  async log(level: string, type: string, user: number, message: string, data?: any): Promise<void> {

    await this.prisma.eventLog.create({ // without await so we don't block the request
      data: {
        level: level,
        type: type,
        userId: user,
        message: message,
        data: data ? JSON.stringify(data) : null,
      },
    });
    // Utilize dynamic logging levels based on the 'level' parameter.
    //this.logger[level](message, data);
  }
}
