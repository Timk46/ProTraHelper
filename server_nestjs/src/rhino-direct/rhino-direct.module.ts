import { Module } from '@nestjs/common';
import { RhinoDirectController } from './rhino-direct.controller';
import { RhinoDirectService } from './rhino-direct.service';
import { RhinoWindowManagerService } from './rhino-window-manager.service';
import { RhinoNativeFocusService } from './rhino-native-focus.service';

import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [RhinoDirectController],
  providers: [
    RhinoDirectService, 
    RhinoWindowManagerService, 
    RhinoNativeFocusService,

  ],
  exports: [
    RhinoDirectService, 
    RhinoWindowManagerService, 
    RhinoNativeFocusService,

  ], 
})
export class RhinoDirectModule {}
