/* eslint-disable @typescript-eslint/no-unnecessary-condition */
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RhinoDirectService } from '../rhino-direct/rhino-direct.service';
import { BatScriptGeneratorService } from '../bat-rhino/bat-script-generator.service';
import { RhinoExecutionResultDTO } from '@DTOs/mcslider.dto';
import * as path from 'path';
import * as fs from 'fs/promises';

@Injectable()
export class RhinoIntegrationService {
  private readonly logger = new Logger(RhinoIntegrationService.name);

  // Centralized configuration
  private readonly config = {
    grasshopperBasePath: path.join(process.cwd(), 'files', 'Grasshopper'),
    defaultFile: 'example.gh',
    questionTypeMapping: {
      MCSLIDER: 'Rahmen.gh',
      GRAPH: 'Test.gh',
      UML: 'example.gh',
      CODE: 'example.gh',
    },
  };

  // Simple caching mechanism
  private readonly cache = new Map<string, { data: string; expiry: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  constructor(
    private readonly prisma: PrismaService,
    private readonly rhinoDirectService: RhinoDirectService,
    private readonly batScriptService: BatScriptGeneratorService,
  ) {}

  /**
   * Resolves the appropriate Grasshopper file path for a given question
   * Uses multi-level fallback strategy: question-specific -> type-mapping -> global fallback
   */
  async resolveGrasshopperFile(questionId: number): Promise<string> {
    const cacheKey = `grasshopper_${questionId}`;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() < cached.expiry) {
      return cached.data;
    }

    const question = await this.prisma.question.findUnique({
      where: { id: questionId },
      select: {
        type: true,
        rhinoGrasshopperFile: true,
        rhinoEnabled: true,
      },
    });

    if (!question || !question.rhinoEnabled) {
      throw new NotFoundException('Question not found or Rhino not enabled');
    }

    let resolvedPath: string;

    // Level 1: Question-specific file
    if (question.rhinoGrasshopperFile) {
      const fullPath = path.join(this.config.grasshopperBasePath, question.rhinoGrasshopperFile);
      if (await this.fileExists(fullPath)) {
        resolvedPath = fullPath;
      }
    }

    // Level 2: Type mapping
    if (!resolvedPath) {
      const typeFile = this.config.questionTypeMapping[question.type];
      if (typeFile) {
        const fullPath = path.join(this.config.grasshopperBasePath, typeFile);
        if (await this.fileExists(fullPath)) {
          resolvedPath = fullPath;
        }
      }
    }

    // Level 3: Global fallback
    if (!resolvedPath) {
      resolvedPath = path.join(this.config.grasshopperBasePath, this.config.defaultFile);
    }

    // Cache the result
    this.cache.set(cacheKey, {
      data: resolvedPath,
      expiry: Date.now() + this.CACHE_DURATION,
    });

    this.logger.log(
      `🦏 Resolved grasshopper file for question ${questionId}: ${path.basename(resolvedPath)}`,
    );
    return resolvedPath;
  }

  /**
   * Executes Rhino for a given question with the appropriate Grasshopper file
   */
  async executeRhinoForQuestion(
    questionId: number,
    executionMode: 'direct' | 'batch' = 'batch',
  ): Promise<RhinoExecutionResultDTO> {
    const startTime = Date.now();

    try {
      // Resolve the Grasshopper file path
      const filePath = await this.resolveGrasshopperFile(questionId);

      // Get question settings
      const question = await this.prisma.question.findUnique({
        where: { id: questionId },
        select: {
          rhinoSettings: true,
          rhinoAutoLaunch: true,
          rhinoAutoFocus: true,
        },
      });

      const rhinoSettings = question?.rhinoSettings as any;

      let result: any;

      if (executionMode === 'direct') {
        // Use direct Rhino execution
        result = await this.rhinoDirectService.launchRhino({
          filePath,
          showViewport: rhinoSettings?.showViewport ?? true,
          batchMode: rhinoSettings?.batchMode ?? false,
        });
      } else {
        // Use batch script execution
        result = await this.batScriptService.generateBatScript({
          filePath,
          rhinoCommand: this.buildGrasshopperCommand(filePath, rhinoSettings),
          showViewport: rhinoSettings?.showViewport ?? true,
          batchMode: rhinoSettings?.batchMode ?? false,
        });
      }

      const executionTime = Date.now() - startTime;

      this.logger.log(
        `🦏 Rhino execution completed for question ${questionId} in ${executionTime}ms`,
      );

      return {
        success: result.success,
        message: result.message,
        rhinoPath: result.rhinoPath,
        processId: result.processId,
        executionTime,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error(`🦏 Rhino execution failed for question ${questionId}: ${error.message}`);

      return {
        success: false,
        message: `Rhino execution failed: ${error.message}`,
        executionTime,
      };
    }
  }

  /**
   * Checks if Rhino is available on the system
   */
  async checkRhinoAvailability(): Promise<boolean> {
    try {
      const systemInfo = await this.rhinoDirectService.getSystemRhinoInfo();
      return systemInfo.installations.length > 0;
    } catch (error) {
      this.logger.error('❌ Rhino availability check failed:', error);
      return false;
    }
  }

  /**
   * Gets available Grasshopper files from the filesystem
   */
  async getAvailableGrasshopperFiles(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.config.grasshopperBasePath);
      return files.filter(file => file.endsWith('.gh'));
    } catch (error) {
      this.logger.error('❌ Failed to read Grasshopper files:', error);
      return [];
    }
  }

  /**
   * Builds the Grasshopper command string for Rhino
   */
  private buildGrasshopperCommand(filePath: string, settings?: any): string {
    const commands = ['_-Grasshopper'];

    if (settings?.batchMode !== false) {
      commands.push('B', 'D', 'W', 'L');
    }

    commands.push('W', 'H', 'D', 'O', `"${filePath}"`, 'W', 'H');

    if (settings?.showViewport !== false) {
      commands.push('_MaxViewport');
    }

    commands.push('_Enter');

    return commands.join(' ');
  }

  /**
   * Checks if a file exists
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Clears the cache (useful for testing or configuration changes)
   */
  clearCache(): void {
    this.cache.clear();
    this.logger.log('🧹 Rhino integration cache cleared');
  }
}
