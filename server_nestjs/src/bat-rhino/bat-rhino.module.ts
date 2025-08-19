import { Module } from '@nestjs/common';
import { BatRhinoController } from './bat-rhino.controller';
import { BatScriptGeneratorService } from './bat-script-generator.service';

/**
 * BatRhinoModule
 * NestJS-Modul für .bat-Skript-basierte Rhino-Integration
 * Stellt Controller und Services für direkte Rhino-Ausführung bereit
 */
@Module({
  controllers: [BatRhinoController],
  providers: [BatScriptGeneratorService],
  exports: [BatScriptGeneratorService],
})
export class BatRhinoModule {}
