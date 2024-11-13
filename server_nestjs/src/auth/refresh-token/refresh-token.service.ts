import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import * as process from 'node:process';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class RefreshTokenService {
  private readonly logger = new Logger(RefreshTokenService.name);
  constructor(private readonly prisma: PrismaService) {}

  async createRefreshToken(email: string, deviceId: string, token: string) {
    const existingToken = await this.prisma.refreshToken.findFirst({
      where: {
        user: {
          email: email,
        },
        deviceId: deviceId,
      },
    });

    const hashedRefreshToken = await bcrypt.hash(token, 10);

    if (existingToken) {
      this.logger.debug('Update existing refresh token for user: ' + email);
      return this.prisma.refreshToken.update({
        where: {
          id: existingToken.id,
        },
        data: {
          token: hashedRefreshToken,
          createdAt: new Date(),
        },
      });
    } else {
      this.logger.debug('Create new refresh token for user: ' + email);
      return this.prisma.refreshToken.create({
        data: {
          user: {
            connect: {
              email: email,
            },
          },
          token: hashedRefreshToken,
          deviceId: deviceId,
        },
      });
    }
  }

  async getRefreshToken(email: string, deviceId: string) {
    return this.prisma.refreshToken.findFirst({
      where: {
        user: {
          email: email,
        },
        deviceId: deviceId,
      },
    });
  }

  async updateRefreshToken(email: string, deviceId: string, token: string) {
    const existingRefreshToken = await this.prisma.refreshToken.findFirst({
      where: {
        user: {
          email: email,
        },
        deviceId: deviceId,
      },
    });

    if (!existingRefreshToken) {
      throw new Error(
        `Refresh token not found for email ${email} and device ID ${deviceId}`,
      );
    }

    const hashedRefreshToken = await bcrypt.hash(token, 10);

    return this.prisma.refreshToken.update({
      where: {
        id: existingRefreshToken.id,
      },
      data: {
        token: hashedRefreshToken,
        createdAt: new Date(),
      },
    });
  }

  async deleteRefreshToken(email: string, deviceId: string) {
    const existingRefreshToken = await this.prisma.refreshToken.findFirst({
      where: {
        user: {
          email: email,
        },
        deviceId: deviceId,
      },
    });

    if (!existingRefreshToken) {
      throw new Error(
        `Refresh token not found for email ${email} and device ID ${deviceId}`,
      );
    }

    return this.prisma.refreshToken.delete({
      where: {
        id: existingRefreshToken.id,
      },
    });
  }

  async deleteAllUserRefreshTokens(email: string) {
    const existingRefreshTokens = await this.prisma.refreshToken.findMany({
      where: {
        user: {
          email: email,
        },
      },
    });

    if (!existingRefreshTokens) {
      throw new Error(`Refresh tokens not found for email ${email}`);
    }

    return this.prisma.refreshToken.deleteMany({
      where: {
        user: {
          email: email,
        },
      },
    });
  }

  async deleteAllRefreshTokens() {
    return this.prisma.refreshToken.deleteMany({});
  }

  @Cron('0 * * * *') // Run every hour
  async purgeExpiredRefreshTokens() {
    const expirationThreshold = new Date();
    expirationThreshold.setMinutes(
      expirationThreshold.getMinutes() -
        parseInt(process.env.JWT_REFRESH_EXPIRATION_TIME),
    );

    this.logger.log(
      `Purging expired refresh tokens older than ${expirationThreshold.toISOString()}`,
    );

    const expiredTokens = await this.prisma.refreshToken.findMany({
      where: {
        createdAt: {
          lte: expirationThreshold,
        },
      },
    });

    if (expiredTokens.length > 0) {
      const tokenIds = expiredTokens.map((token) => token.id);

      await this.prisma.refreshToken.deleteMany({
        where: {
          id: {
            in: tokenIds,
          },
        },
      });

      this.logger.log(
        `${expiredTokens.length} expired refresh tokens have been purged from the database.`,
      );
    } else {
      this.logger.log('No expired refresh tokens found.');
    }
  }
}
