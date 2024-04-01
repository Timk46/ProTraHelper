import { Global, Module } from '@nestjs/common';
import { EventLogService } from './event-log.service';
import { PrismaModule } from '@/prisma/prisma.module';
import { EventLogController } from './event-log.controller';

/**
 * @Global() makes EventLogModule a global module, meaning it will be available across the entire
 * application without the need to explicitly import it in other modules. This is particularly
 * useful for services that are widely used across the application, such as logging or configuration.
 */
@Global()
@Module({
  providers: [EventLogService],
  imports: [PrismaModule],
  controllers: [EventLogController],
  exports: [EventLogService],
})
export class EventLogModule {}
