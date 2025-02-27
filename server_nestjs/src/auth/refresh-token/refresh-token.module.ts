import { Module } from '@nestjs/common';
import { RefreshTokenService } from './refresh-token.service';
import { PrismaModule } from '@/prisma/prisma.module';

@Module({
  providers: [RefreshTokenService],
  controllers: [],
  imports: [PrismaModule],
  exports: [RefreshTokenService],
})
export class RefreshTokenModule {}
