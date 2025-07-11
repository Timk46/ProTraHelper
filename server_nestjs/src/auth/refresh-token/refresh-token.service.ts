import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import * as process from 'node:process';
import { Cron } from '@nestjs/schedule';

/**
 * Provides refreshtoken services
 */
@Injectable()
export class RefreshTokenService {
  private readonly logger = new Logger(RefreshTokenService.name);
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates or updates a refresh token for a user based on their email and device ID.
   *
   * @param email - The email of the user for whom the refresh token is being created or updated.
   * @param deviceId - The ID of the device for which the refresh token is being created or updated.
   * @param token - The refresh token to be hashed and stored.
   * @returns A promise that resolves to the created or updated refresh token record.
   */
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

  /**
   * Retrieves a refresh token for a specific user and device.
   *
   * @param email - The email of the user.
   * @param deviceId - The ID of the device.
   * @returns A promise that resolves to the refresh token if found, or null if not found.
   */
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

  /**
   * Updates the refresh token for a given user and device.
   *
   * @param email - The email of the user.
   * @param deviceId - The ID of the device.
   * @param token - The new refresh token to be updated.
   * @returns The updated refresh token record.
   * @throws Will throw an error if the refresh token is not found for the given email and device ID.
   */
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

  /**
   * Deletes a refresh token associated with a specific email and device ID.
   *
   * @param email - The email of the user whose refresh token is to be deleted.
   * @param deviceId - The device ID associated with the refresh token to be deleted.
   * @returns The deleted refresh token record.
   * @throws { Error } If no refresh token is found for the given email and device ID.
   */
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

  /**
   * Deletes all refresh tokens associated with a user's email.
   *
   * @param email - The email of the user whose refresh tokens are to be deleted.
   * @returns A promise that resolves to the result of the delete operation.
   * @throws An error if no refresh tokens are found for the specified email.
   */
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

  /**
   * Deletes all refresh tokens from the database.
   *
   * @returns A promise that resolves to the result of the delete operation.
   */
  async deleteAllRefreshTokens() {
    return this.prisma.refreshToken.deleteMany({});
  }

  /**
   * Purges expired refresh tokens from the database.
   *
   * @returns { Promise<void> } A promise that resolves when the operation is complete.
   */
  @Cron('0 * * * *') // Run every hour
  async purgeExpiredRefreshTokens() {
    const expirationThreshold = new Date();
    expirationThreshold.setMinutes(
      expirationThreshold.getMinutes() - parseInt(process.env.JWT_REFRESH_EXPIRATION_TIME),
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
      const tokenIds = expiredTokens.map(token => token.id);

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
