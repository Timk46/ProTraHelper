import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { EvaluationAuthorizationService } from './evaluation-authorization.service';
import { PrismaService } from '../prisma/prisma.service';
import { Logger } from '@nestjs/common';
import { GlobalRole } from '@prisma/client';

describe('EvaluationAuthorizationService', () => {
  let service: EvaluationAuthorizationService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    evaluationSubmission: {
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    userGroup: {
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EvaluationAuthorizationService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<EvaluationAuthorizationService>(EvaluationAuthorizationService);
    prismaService = module.get<PrismaService>(PrismaService);

    // Suppress logger output during tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('canAccessSubmission', () => {
    it('should return true for TEACHER role', async () => {
      const submissionId = 1;
      const userId = 100;

      mockPrismaService.evaluationSubmission.findUnique.mockResolvedValue({
        id: submissionId,
        authorId: 200, // Different from userId
      });

      mockPrismaService.user.findUnique.mockResolvedValue({
        id: userId,
        globalRole: GlobalRole.TEACHER,
      });

      const result = await service.canAccessSubmission(submissionId, userId);

      expect(result).toBe(true);
      expect(mockPrismaService.evaluationSubmission.findUnique).toHaveBeenCalledWith({
        where: { id: submissionId },
        select: { id: true, authorId: true },
      });
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
        select: { id: true, globalRole: true },
      });
    });

    it('should return true for ADMIN role', async () => {
      const submissionId = 1;
      const userId = 100;

      mockPrismaService.evaluationSubmission.findUnique.mockResolvedValue({
        id: submissionId,
        authorId: 200,
      });

      mockPrismaService.user.findUnique.mockResolvedValue({
        id: userId,
        globalRole: GlobalRole.ADMIN,
      });

      const result = await service.canAccessSubmission(submissionId, userId);

      expect(result).toBe(true);
    });

    it('should return true when user is the submission author', async () => {
      const submissionId = 1;
      const userId = 100;

      mockPrismaService.evaluationSubmission.findUnique.mockResolvedValue({
        id: submissionId,
        authorId: userId, // Same as userId
      });

      mockPrismaService.user.findUnique.mockResolvedValue({
        id: userId,
        globalRole: GlobalRole.STUDENT,
      });

      // Mock that they share a group
      mockPrismaService.userGroup.count.mockResolvedValue(1);

      const result = await service.canAccessSubmission(submissionId, userId);

      expect(result).toBe(true);
    });

    it('should return true when users share a group', async () => {
      const submissionId = 1;
      const userId = 100;
      const authorId = 200;

      mockPrismaService.evaluationSubmission.findUnique.mockResolvedValue({
        id: submissionId,
        authorId: authorId,
      });

      mockPrismaService.user.findUnique.mockResolvedValue({
        id: userId,
        globalRole: GlobalRole.STUDENT,
      });

      mockPrismaService.userGroup.count.mockResolvedValue(1); // Shared group exists

      const result = await service.canAccessSubmission(submissionId, userId);

      expect(result).toBe(true);
      expect(mockPrismaService.userGroup.count).toHaveBeenCalledWith({
        where: {
          AND: [
            { UserGroupMembership: { some: { userId: authorId } } },
            { UserGroupMembership: { some: { userId: userId } } },
          ],
        },
        take: 1,
      });
    });

    it('should return false when users do not share a group', async () => {
      const submissionId = 1;
      const userId = 100;
      const authorId = 200;

      mockPrismaService.evaluationSubmission.findUnique.mockResolvedValue({
        id: submissionId,
        authorId: authorId,
      });

      mockPrismaService.user.findUnique.mockResolvedValue({
        id: userId,
        globalRole: GlobalRole.STUDENT,
      });

      mockPrismaService.userGroup.count.mockResolvedValue(0); // No shared group

      const result = await service.canAccessSubmission(submissionId, userId);

      expect(result).toBe(false);
    });

    it('should throw NotFoundException when submission does not exist', async () => {
      const submissionId = 999;
      const userId = 100;

      mockPrismaService.evaluationSubmission.findUnique.mockResolvedValue(null);
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: userId,
        globalRole: GlobalRole.STUDENT,
      });

      await expect(service.canAccessSubmission(submissionId, userId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.canAccessSubmission(submissionId, userId)).rejects.toThrow(
        `Evaluation submission with ID ${submissionId} not found`,
      );
    });

    it('should throw NotFoundException when user does not exist', async () => {
      const submissionId = 1;
      const userId = 999;

      mockPrismaService.evaluationSubmission.findUnique.mockResolvedValue({
        id: submissionId,
        authorId: 200,
      });
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.canAccessSubmission(submissionId, userId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.canAccessSubmission(submissionId, userId)).rejects.toThrow(
        `User with ID ${userId} not found`,
      );
    });
  });

  describe('checkAccessOrThrow', () => {
    it('should not throw when user has access', async () => {
      const submissionId = 1;
      const userId = 100;

      mockPrismaService.evaluationSubmission.findUnique.mockResolvedValue({
        id: submissionId,
        authorId: userId,
      });

      mockPrismaService.user.findUnique.mockResolvedValue({
        id: userId,
        globalRole: GlobalRole.TEACHER,
      });

      await expect(service.checkAccessOrThrow(submissionId, userId)).resolves.not.toThrow();
    });

    it('should throw NotFoundException when submission does not exist', async () => {
      const submissionId = 999;
      const userId = 100;

      mockPrismaService.evaluationSubmission.findUnique.mockResolvedValue(null);
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: userId,
        globalRole: GlobalRole.STUDENT,
      });

      await expect(service.checkAccessOrThrow(submissionId, userId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.checkAccessOrThrow(submissionId, userId)).rejects.toThrow(
        `Evaluation submission with ID ${submissionId} not found`,
      );
    });

    it('should throw ForbiddenException when user does not have access', async () => {
      const submissionId = 1;
      const userId = 100;
      const authorId = 200;

      mockPrismaService.evaluationSubmission.findUnique.mockResolvedValue({
        id: submissionId,
        authorId: authorId,
      });

      mockPrismaService.user.findUnique.mockResolvedValue({
        id: userId,
        globalRole: GlobalRole.STUDENT,
      });

      mockPrismaService.userGroup.count.mockResolvedValue(0); // No shared group

      await expect(service.checkAccessOrThrow(submissionId, userId)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.checkAccessOrThrow(submissionId, userId)).rejects.toThrow(
        'You do not have permission to access this submission',
      );
    });
  });

  describe('Group membership logic (tested via canAccessSubmission)', () => {
    it('should use optimized count query with take:1 for group check', async () => {
      const submissionId = 1;
      const userId = 100;
      const authorId = 200;

      mockPrismaService.evaluationSubmission.findUnique.mockResolvedValue({
        id: submissionId,
        authorId: authorId,
      });

      mockPrismaService.user.findUnique.mockResolvedValue({
        id: userId,
        globalRole: GlobalRole.STUDENT,
      });

      mockPrismaService.userGroup.count.mockResolvedValue(1);

      await service.canAccessSubmission(submissionId, userId);

      // Verify take:1 optimization is used for performance
      expect(mockPrismaService.userGroup.count).toHaveBeenCalledWith({
        where: {
          AND: [
            { UserGroupMembership: { some: { userId: authorId } } },
            { UserGroupMembership: { some: { userId: userId } } },
          ],
        },
        take: 1,
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle author with zero group memberships', async () => {
      const submissionId = 1;
      const userId = 100;
      const authorId = 200;

      mockPrismaService.evaluationSubmission.findUnique.mockResolvedValue({
        id: submissionId,
        authorId: authorId,
      });

      mockPrismaService.user.findUnique.mockResolvedValue({
        id: userId,
        globalRole: GlobalRole.STUDENT,
      });

      mockPrismaService.userGroup.count.mockResolvedValue(0); // Author has no groups

      const result = await service.canAccessSubmission(submissionId, userId);

      expect(result).toBe(false);
    });

    it('should handle user accessing their own submission', async () => {
      const submissionId = 1;
      const userId = 100;

      mockPrismaService.evaluationSubmission.findUnique.mockResolvedValue({
        id: submissionId,
        authorId: userId, // Same user
      });

      mockPrismaService.user.findUnique.mockResolvedValue({
        id: userId,
        globalRole: GlobalRole.STUDENT,
      });

      mockPrismaService.userGroup.count.mockResolvedValue(1); // User in a group

      const result = await service.canAccessSubmission(submissionId, userId);

      expect(result).toBe(true);
    });

    it('should handle concurrent access checks with Promise.all', async () => {
      const submissionId = 1;
      const userId = 100;

      mockPrismaService.evaluationSubmission.findUnique.mockResolvedValue({
        id: submissionId,
        authorId: 200,
      });

      mockPrismaService.user.findUnique.mockResolvedValue({
        id: userId,
        globalRole: GlobalRole.TEACHER,
      });

      // Call multiple times concurrently
      const promises = [
        service.canAccessSubmission(submissionId, userId),
        service.canAccessSubmission(submissionId, userId),
        service.canAccessSubmission(submissionId, userId),
      ];

      const results = await Promise.all(promises);

      expect(results).toEqual([true, true, true]);
      // Verify parallel queries were executed
      expect(mockPrismaService.evaluationSubmission.findUnique).toHaveBeenCalledTimes(3);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledTimes(3);
    });
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should have PrismaService injected', () => {
      expect(prismaService).toBeDefined();
    });
  });
});
