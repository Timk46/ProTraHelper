import { Module } from '@nestjs/common';
import { PmpmController } from './pmpm.controller';
import { PmpmService } from './pmpm.service';
import { JwtModule } from '@nestjs/jwt';
import { PmpmEventsGateway } from './pmpm-events.gateway';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.PMPM_JWT_SECRET || 'pmpm-secret-key',
      signOptions: { expiresIn: '300s' }, // Increased to 5 minutes for better testing
    }),
  ],
  controllers: [PmpmController],
  providers: [PmpmService, PmpmEventsGateway],
  exports: [PmpmService],
})
export class PmpmModule {}
