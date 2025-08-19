import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService } from '../../notification/notification.service';
import {
  CreateEvaluationSessionDTO,
  UpdateEvaluationSessionDTO,
  EvaluationSessionDTO,
  EvaluationCategoryDTO,
} from '@DTOs/index';
import { EvaluationPhase } from '@prisma/client';

@Injectable()
export class EvaluationSessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  async findAll(moduleId?: number): Promise<EvaluationSessionDTO[]> {
    const sessions = await this.prisma.evaluationSession.findMany({
      where: moduleId ? { moduleId } : undefined,
      include: {
        module: true,
        createdBy: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
            email: true,
          },
        },
        submissions: {
          include: {
            author: {
              select: {
                id: true,
                firstname: true,
                lastname: true,
              },
            },
          },
        },
        categories: {
          orderBy: { order: 'asc' },
        },
        _count: {
          select: {
            submissions: true,
            categories: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return sessions.map(this.mapToDTO);
  }

  async findOne(id: number): Promise<EvaluationSessionDTO> {
    const session = await this.prisma.evaluationSession.findUnique({
      where: { id },
      include: {
        module: true,
        createdBy: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
            email: true,
          },
        },
        submissions: {
          include: {
            author: {
              select: {
                id: true,
                firstname: true,
                lastname: true,
              },
            },
            pdfFile: true,
          },
        },
        categories: {
          orderBy: { order: 'asc' },
        },
        _count: {
          select: {
            submissions: true,
            categories: true,
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException(`Evaluation session with ID ${id} not found`);
    }

    return this.mapToDTO(session);
  }

  async create(
    createDto: CreateEvaluationSessionDTO,
    userId: number,
  ): Promise<EvaluationSessionDTO> {
    const session = await this.prisma.evaluationSession.create({
      data: {
        title: createDto.title,
        description: createDto.description,
        startDate: createDto.startDate,
        endDate: createDto.endDate,
        moduleId: createDto.moduleId,
        createdById: userId,
        isActive: true,
        isAnonymous: createDto.isAnonymous ?? true,
        phase: EvaluationPhase.DISCUSSION,
      },
      include: {
        module: true,
        createdBy: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
            email: true,
          },
        },
        _count: {
          select: {
            submissions: true,
            categories: true,
          },
        },
      },
    });

    // Create default categories
    await this.createDefaultCategories(session.id);

    // Reload session with categories
    const sessionWithCategories = await this.findOne(session.id);

    return sessionWithCategories;
  }

  async update(id: number, updateDto: UpdateEvaluationSessionDTO): Promise<EvaluationSessionDTO> {
    const session = await this.prisma.evaluationSession.update({
      where: { id },
      data: updateDto,
      include: {
        module: true,
        createdBy: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
            email: true,
          },
        },
        _count: {
          select: {
            submissions: true,
            categories: true,
          },
        },
      },
    });

    return this.mapToDTO(session);
  }

  async remove(id: number): Promise<void> {
    await this.prisma.evaluationSession.delete({
      where: { id },
    });
  }

  async switchPhase(id: number, phase: 'DISCUSSION' | 'EVALUATION'): Promise<EvaluationSessionDTO> {
    const session = await this.prisma.evaluationSession.update({
      where: { id },
      data: { phase: phase as EvaluationPhase },
      include: {
        module: true,
        createdBy: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
            email: true,
          },
        },
        _count: {
          select: {
            submissions: true,
            categories: true,
          },
        },
      },
    });

    // Notify all participants about phase switch
    await this.notificationService.notifyPhaseSwitch(id, phase);

    return this.mapToDTO(session);
  }

  /**
   * Get all categories for a specific evaluation session
   *
   * @description Retrieves all evaluation categories associated with a session,
   * ordered by their display order. Categories are used to organize discussions
   * and ratings into thematic groups.
   *
   * @param sessionId - The ID of the evaluation session
   * @returns Promise resolving to an array of evaluation categories
   * @throws NotFoundException if the session does not exist
   */
  async getCategories(sessionId: number): Promise<EvaluationCategoryDTO[]> {
    // First verify the session exists
    const session = await this.prisma.evaluationSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException(`Evaluation session with ID ${sessionId} not found`);
    }

    const categories = await this.prisma.evaluationCategory.findMany({
      where: { sessionId },
      orderBy: { order: 'asc' },
    });

    return categories.map(category => ({
      id: category.id,
      name: category.name,
      displayName: category.displayName,
      description: category.description,
      icon: category.icon,
      order: category.order,
      color: category.color,
    }));
  }

  private async createDefaultCategories(sessionId: number): Promise<void> {
    const defaultCategories = [
      {
        name: 'vollstaendigkeit',
        displayName: 'Vollständigkeit',
        description: 'Vollständigkeit der Lösung',
        icon: 'check_circle',
        color: '#4CAF50',
        order: 1,
      },
      {
        name: 'grafische_darstellung',
        displayName: 'Grafische Darstellungsqualität',
        description: 'Qualität der grafischen Darstellung',
        icon: 'palette',
        color: '#2196F3',
        order: 2,
      },
      {
        name: 'vergleichbarkeit',
        displayName: 'Vergleichbarkeit',
        description: 'Vergleichbarkeit mit anderen Lösungen',
        icon: 'compare',
        color: '#FF9800',
        order: 3,
      },
      {
        name: 'komplexitaet',
        displayName: 'Komplexität',
        description: 'Komplexität der Lösung',
        icon: 'settings',
        color: '#9C27B0',
        order: 4,
      },
    ];

    await this.prisma.evaluationCategory.createMany({
      data: defaultCategories.map(cat => ({
        sessionId,
        ...cat,
      })),
    });
  }

  private mapToDTO(session: any): EvaluationSessionDTO {
    return {
      id: session.id,
      title: session.title,
      description: session.description,
      startDate: session.startDate,
      endDate: session.endDate,
      moduleId: session.moduleId,
      createdById: session.createdById,
      isActive: session.isActive,
      isAnonymous: session.isAnonymous,
      phase: session.phase,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      module: session.module,
      createdBy: session.createdBy,
      submissions: session.submissions,
      categories: session.categories,
      _count: session._count,
    };
  }
}
