import { Module } from '@nestjs/common';
import { RhinoDirectController } from './rhino-direct.controller';
import { RhinoDirectService } from './rhino-direct.service';
import { RhinoWindowManagerService } from './rhino-window-manager.service';

@Module({
  controllers: [RhinoDirectController],
  providers: [RhinoDirectService, RhinoWindowManagerService],
  exports: [RhinoDirectService, RhinoWindowManagerService],
})
export class RhinoDirectModule {}
