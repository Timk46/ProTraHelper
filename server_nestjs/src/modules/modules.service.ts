import { PrismaService } from '@/prisma/prisma.service';
import { ModuleDTO } from '@Interfaces/module.dto';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ModulesService {

    constructor(private prisma: PrismaService) { }

    async getUserModules(userId: number): Promise<ModuleDTO[]> {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: { modules: true },
        });

        const modules: ModuleDTO[] = user.modules.map((module) => {
            return {
                id: module.id,
                name: module.name,
                description: module.description,
            };
        });

        return modules; 
    }
}
