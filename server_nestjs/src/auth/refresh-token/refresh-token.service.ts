import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import * as bcrypt from 'bcrypt';

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
      throw new Error(`Refresh token not found for email ${email} and device ID ${deviceId}`);
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
      throw new Error(`Refresh token not found for email ${email} and device ID ${deviceId}`);
    }

    return this.prisma.refreshToken.delete({
      where: {
        id: existingRefreshToken.id,
      },
    });
  }
}
