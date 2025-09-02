import { Injectable } from '@nestjs/common';
import { ModuleDTO } from '@DTOs/index';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UserModuleService {
  constructor(private readonly prisma: PrismaService) {}

  async getAllUserModules(): Promise<ModuleDTO[]> {
    const modules = await this.prisma.module.findMany();
    return modules.map(module => ({
      id: module.id,
      name: module.name,
      description: module.description,
    }));
  }
}
