import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class ModuleSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSetting(moduleId: number, key: string) {
    const setting = await this.prisma.moduleSetting.findUnique({
      where: {
        moduleId_key: {
          moduleId,
          key,
        },
      },
    });

    // If setting doesn't exist, create it with default value
    if (!setting) {
      const defaultValue = this.getDefaultValue(key);
      if (defaultValue !== null) {
        console.log(
          `📝 Creating missing ModuleSetting: moduleId=${moduleId}, key=${key}, defaultValue=${defaultValue}`,
        );
        return this.prisma.moduleSetting.create({
          data: {
            moduleId,
            key,
            value: defaultValue,
            updatedBy: 1, // Use admin user ID as default
          },
        });
      }
    }

    return setting;
  }

  /**
   * Returns default values for module settings
   */
  private getDefaultValue(key: string): string | null {
    const defaults: Record<string, string> = {
      enabled_navigators: '["default"]',
      theme: 'light',
      language: 'de',
      max_upload_size: '10485760', // 10MB in bytes
      session_timeout: '3600', // 1 hour in seconds
    };

    return defaults[key] || null;
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
        updatedBy: userId,
      },
    });
  }
}
