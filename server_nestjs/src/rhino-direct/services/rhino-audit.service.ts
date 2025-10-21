/**
 * Rhino Audit Service
 * Protokolliert alle Rhino-Operationen für Sicherheitsüberwachung und Compliance
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface RhinoAuditEvent {
  userId: number;
  userEmail: string;
  operation: 'launch' | 'focus' | 'info' | 'debug' | 'config' | 'window_query';
  endpoint: string;
  parameters?: Record<string, any>;
  result: 'success' | 'error' | 'rate_limited' | 'unauthorized';
  errorMessage?: string;
  ipAddress: string;
  userAgent?: string;
  sessionId?: string;
  timestamp: Date;
  responseTime?: number; // milliseconds
  securityContext?: {
    riskLevel: 'low' | 'medium' | 'high';
    suspicious: boolean;
    reason?: string;
  };
}

export interface RhinoSecurityMetrics {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  rateLimitedOperations: number;
  unauthorizedAttempts: number;
  uniqueUsers: number;
  operationsByType: Record<string, number>;
  averageResponseTime: number;
  suspiciousActivities: number;
  topUsers: Array<{ userId: number; userEmail: string; count: number }>;
  recentErrors: Array<RhinoAuditEvent>;
}

@Injectable()
export class RhinoAuditService {
  constructor(private prisma: PrismaService) {}

  /**
   * Records a Rhino operation audit event
   */
  async logRhinoOperation(event: RhinoAuditEvent): Promise<void> {
    try {
      await this.prisma.rhinoAuditLog.create({
        data: {
          userId: event.userId,
          userEmail: event.userEmail,
          operation: event.operation,
          endpoint: event.endpoint,
          parameters: event.parameters ? JSON.stringify(event.parameters) : null,
          result: event.result,
          errorMessage: event.errorMessage,
          ipAddress: event.ipAddress,
          userAgent: event.userAgent,
          sessionId: event.sessionId,
          timestamp: event.timestamp,
          responseTime: event.responseTime,
          securityRiskLevel: event.securityContext?.riskLevel || 'low',
          suspicious: event.securityContext?.suspicious || false,
          suspiciousReason: event.securityContext?.reason,
        },
      });

      // Check for suspicious patterns and alert if necessary
      if (event.securityContext?.suspicious) {
        await this.handleSuspiciousActivity(event);
      }
    } catch (error) {
      console.error('Failed to log Rhino audit event:', error);
      // Don't throw - audit logging should not break the main operation
    }
  }

  /**
   * Logs a successful Rhino operation
   */
  async logSuccess(
    userId: number,
    userEmail: string,
    operation: RhinoAuditEvent['operation'],
    endpoint: string,
    parameters: Record<string, any>,
    ipAddress: string,
    responseTime: number,
    userAgent?: string
  ): Promise<void> {
    await this.logRhinoOperation({
      userId,
      userEmail,
      operation,
      endpoint,
      parameters,
      result: 'success',
      ipAddress,
      userAgent,
      timestamp: new Date(),
      responseTime,
      securityContext: {
        riskLevel: this.calculateRiskLevel(operation, parameters),
        suspicious: false,
      },
    });
  }

  /**
   * Logs a failed Rhino operation
   */
  async logError(
    userId: number,
    userEmail: string,
    operation: RhinoAuditEvent['operation'],
    endpoint: string,
    parameters: Record<string, any>,
    errorMessage: string,
    ipAddress: string,
    userAgent?: string
  ): Promise<void> {
    const suspicious = this.isSuspiciousError(errorMessage, operation);
    
    await this.logRhinoOperation({
      userId,
      userEmail,
      operation,
      endpoint,
      parameters,
      result: 'error',
      errorMessage,
      ipAddress,
      userAgent,
      timestamp: new Date(),
      securityContext: {
        riskLevel: suspicious ? 'high' : 'medium',
        suspicious,
        reason: suspicious ? `Suspicious error pattern in ${operation}` : undefined,
      },
    });
  }

  /**
   * Logs rate limiting event
   */
  async logRateLimit(
    userId: number,
    userEmail: string,
    operation: RhinoAuditEvent['operation'],
    endpoint: string,
    ipAddress: string,
    userAgent?: string
  ): Promise<void> {
    await this.logRhinoOperation({
      userId,
      userEmail,
      operation,
      endpoint,
      result: 'rate_limited',
      ipAddress,
      userAgent,
      timestamp: new Date(),
      securityContext: {
        riskLevel: 'medium',
        suspicious: true,
        reason: 'Rate limit exceeded - potential abuse',
      },
    });
  }

  /**
   * Gets security metrics for dashboard
   */
  async getSecurityMetrics(
    startDate: Date,
    endDate: Date
  ): Promise<RhinoSecurityMetrics> {
    const logs = await this.prisma.rhinoAuditLog.findMany({
      where: {
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: {
        timestamp: 'desc',
      },
    });

    const totalOperations = logs.length;
    const successfulOperations = logs.filter(log => log.result === 'success').length;
    const failedOperations = logs.filter(log => log.result === 'error').length;
    const rateLimitedOperations = logs.filter(log => log.result === 'rate_limited').length;
    const unauthorizedAttempts = logs.filter(log => log.result === 'unauthorized').length;
    const suspiciousActivities = logs.filter(log => log.suspicious).length;

    const uniqueUsers = new Set(logs.map(log => log.userId)).size;
    
    const operationsByType = logs.reduce((acc, log) => {
      acc[log.operation] = (acc[log.operation] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const averageResponseTime = logs
      .filter(log => log.responseTime)
      .reduce((sum, log) => sum + (log.responseTime || 0), 0) / 
      logs.filter(log => log.responseTime).length || 0;

    const userCounts = logs.reduce((acc, log) => {
      const key = `${log.userId}-${log.userEmail}`;
      if (!acc[key]) {
        acc[key] = { userId: log.userId, userEmail: log.userEmail, count: 0 };
      }
      acc[key].count++;
      return acc;
    }, {} as Record<string, { userId: number; userEmail: string; count: number }>);

    const topUsers: Array<{ userId: number; userEmail: string; count: number }> = 
      (Object.values(userCounts) as Array<{ userId: number; userEmail: string; count: number }>)
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

    const recentErrors = logs
      .filter(log => log.result === 'error')
      .slice(0, 20)
      .map(log => ({
        userId: log.userId,
        userEmail: log.userEmail,
        operation: log.operation as RhinoAuditEvent['operation'],
        endpoint: log.endpoint,
        parameters: log.parameters ? JSON.parse(log.parameters) : undefined,
        result: log.result as RhinoAuditEvent['result'],
        errorMessage: log.errorMessage,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
        timestamp: log.timestamp,
        responseTime: log.responseTime,
        securityContext: {
          riskLevel: log.securityRiskLevel as 'low' | 'medium' | 'high',
          suspicious: log.suspicious,
          reason: log.suspiciousReason,
        },
      }));

    return {
      totalOperations,
      successfulOperations,
      failedOperations,
      rateLimitedOperations,
      unauthorizedAttempts,
      uniqueUsers,
      operationsByType,
      averageResponseTime,
      suspiciousActivities,
      topUsers,
      recentErrors,
    };
  }

  /**
   * Calculates risk level based on operation and parameters
   */
  private calculateRiskLevel(
    operation: RhinoAuditEvent['operation'],
    parameters: Record<string, any>
  ): 'low' | 'medium' | 'high' {
    // Launch operations with executable paths are higher risk
    if (operation === 'launch' && parameters.filePath) {
      return 'medium';
    }
    
    // Debug operations are always high risk
    if (operation === 'debug') {
      return 'high';
    }

    // Config changes are medium risk
    if (operation === 'config') {
      return 'medium';
    }

    // Info and focus operations are low risk
    return 'low';
  }

  /**
   * Checks if an error indicates suspicious activity
   */
  private isSuspiciousError(errorMessage: string, operation: string): boolean {
    const suspiciousPatterns = [
      /path.*traversal/i,
      /\.\.[\\/]/,
      /script.*injection/i,
      /malicious/i,
      /unauthorized.*access/i,
      /invalid.*executable/i,
    ];

    return suspiciousPatterns.some(pattern => pattern.test(errorMessage));
  }

  /**
   * Handles suspicious activity detection
   */
  private async handleSuspiciousActivity(event: RhinoAuditEvent): Promise<void> {
    console.warn(`🚨 Suspicious Rhino activity detected:`, {
      userId: event.userId,
      operation: event.operation,
      reason: event.securityContext?.reason,
      timestamp: event.timestamp,
    });

    // In a production system, this could:
    // - Send alerts to security team
    // - Temporarily block the user
    // - Trigger additional monitoring
    // - Log to security information and event management (SIEM) system
  }
}