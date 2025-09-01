/**
 * Rhino Unified Module
 * Provides unified Rhino management combining focus and launch capabilities
 */

import { Module } from '@nestjs/common';
import { RhinoUnifiedController } from './rhino-unified.controller';
import { RhinoUnifiedService } from './rhino-unified.service';
import { RhinoDirectModule } from '../rhino-direct/rhino-direct.module';
import { BatRhinoModule } from '../bat-rhino/bat-rhino.module';

@Module({
  imports: [
    RhinoDirectModule, // For window management and focusing
    BatRhinoModule, // For launching and script generation
  ],
  controllers: [RhinoUnifiedController],
  providers: [RhinoUnifiedService],
  exports: [RhinoUnifiedService],
})
export class RhinoUnifiedModule {}
