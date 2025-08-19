import { Module } from '@nestjs/common';
import { MCSliderController } from './mcslider.controller';
import { MCSliderService } from './mcslider.service';
import { PrismaService } from '../prisma/prisma.service';
import { RhinoIntegrationModule } from '../rhino-integration/rhino-integration.module';

@Module({
  imports: [RhinoIntegrationModule],
  controllers: [MCSliderController],
  providers: [MCSliderService, PrismaService],
  exports: [MCSliderService],
})
export class MCSliderModule {}
