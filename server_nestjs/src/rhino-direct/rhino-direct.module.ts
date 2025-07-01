import { Module } from '@nestjs/common';
import { RhinoDirectController } from './rhino-direct.controller';
import { RhinoDirectService } from './rhino-direct.service';

@Module({
  controllers: [RhinoDirectController],
  providers: [RhinoDirectService],
  exports: [RhinoDirectService],
})
export class RhinoDirectModule {}
