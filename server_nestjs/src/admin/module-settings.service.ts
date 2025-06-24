import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class ModuleSettingsService {
  constructor(private prisma: PrismaService) {}

  async getSetting(moduleId: number, key: string) {
    return this.prisma.moduleSetting.findUnique({
      where: {
        moduleId_key: {
          moduleId,
          key,
        },
      },
    });
  }

  async updateSetting(moduleId: number, key: string, value: string, userId: number) {
    return this.prisma.moduleSetting.upsert({
      where: {
        moduleId_key: {
          moduleId,
          key,
        },
      },
      update: {
        value,
      },
      create: {
        moduleId,
        key,
        value,
        updatedBy: userId
      },
    });
  }
}
