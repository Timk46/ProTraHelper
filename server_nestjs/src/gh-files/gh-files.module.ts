import { Module } from '@nestjs/common';
import { GhFilesController } from './gh-files.controller';
import { GhFilesService } from './gh-files.service';
import { ConfigModule } from '@nestjs/config'; // Import ConfigModule if you plan to use ConfigService

@Module({
  imports: [
    ConfigModule, // Add ConfigModule here if GhFilesService uses ConfigService
                  // If ConfigService is globally available, this might not be strictly necessary here
                  // but it's good practice to import dependencies explicitly.
  ],
  controllers: [GhFilesController],
  providers: [GhFilesService],
  exports: [GhFilesService], // Export if other modules need to use GhFilesService
})
export class GhFilesModule {}
