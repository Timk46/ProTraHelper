import { Module } from '@nestjs/common';
import { RhinoIntegrationController } from './rhino-integration.controller';
import { RhinoIntegrationService } from './rhino-integration.service';
import { PrismaService } from '../prisma/prisma.service';
import { RhinoDirectModule } from '../rhino-direct/rhino-direct.module';
import { BatRhinoModule } from '../bat-rhino/bat-rhino.module';

@Module({
  imports: [RhinoDirectModule, BatRhinoModule],
  controllers: [RhinoIntegrationController],
  providers: [RhinoIntegrationService, PrismaService],
  exports: [RhinoIntegrationService]
})
export class RhinoIntegrationModule {}