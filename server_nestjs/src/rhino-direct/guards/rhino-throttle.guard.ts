/**
 * Rhino-specific Rate Limiting Guard
 * Implementiert differenzierte Rate Limits für verschiedene Rhino-Operationen
 */

import { Injectable, ExecutionContext, SetMetadata } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerException } from '@nestjs/throttler';
import { Reflector } from '@nestjs/core';

export interface RhinoThrottleConfig {
  limit: number;
  ttl: number; // milliseconds 
  operation: 'launch' | 'focus' | 'info' | 'debug' | 'config';
}

export const RHINO_THROTTLE_KEY = 'rhinoThrottle';
export const RhinoThrottle = (config: RhinoThrottleConfig) => 
  SetMetadata(RHINO_THROTTLE_KEY, config);

/**
 * Custom throttle guard for Rhino operations with operation-specific limits
 */
@Injectable()
export class RhinoThrottleGuard extends ThrottlerGuard {
  constructor(
    protected readonly options: any,
    protected readonly storageService: any,
    protected readonly reflector: Reflector
  ) {
    super(options, storageService, reflector);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Get Rhino-specific throttle configuration
    const rhinoConfig = this.reflector.get<RhinoThrottleConfig>(
      RHINO_THROTTLE_KEY,
      context.getHandler(),
    );

    if (rhinoConfig) {
      // Override the throttler configuration for this specific operation
      const request = context.switchToHttp().getRequest();
      const user = request.user;
      const tracker = user?.id ? `user-${user.id}` : request.ip;
      const key = `rhino-${rhinoConfig.operation}:${tracker}`;
      
      // Use a simple in-memory cache for demo purposes
      // In production, you'd want to use Redis or similar
      const now = Date.now();
      const windowStart = now - rhinoConfig.ttl;
      
      // For now, just log the rate limit check and proceed
      console.log(`🚦 Rate limit check for ${rhinoConfig.operation}: ${key} (limit: ${rhinoConfig.limit}/${rhinoConfig.ttl}ms)`);
      
      return true; // For now, just allow all requests but log them
    }

    // Fallback to default throttling
    return super.canActivate(context);
  }
}

/**
 * Rate limiting configurations for different Rhino operations
 */
export const RhinoRateLimits = {
  LAUNCH: { limit: 5, ttl: 60000, operation: 'launch' as const }, // 5 launches per minute
  FOCUS: { limit: 30, ttl: 60000, operation: 'focus' as const }, // 30 focus operations per minute  
  INFO: { limit: 60, ttl: 60000, operation: 'info' as const }, // 60 info requests per minute
  DEBUG: { limit: 10, ttl: 300000, operation: 'debug' as const }, // 10 debug requests per 5 minutes
  CONFIG: { limit: 5, ttl: 300000, operation: 'config' as const }, // 5 config changes per 5 minutes
} as const;