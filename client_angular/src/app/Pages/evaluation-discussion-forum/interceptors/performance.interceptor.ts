import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpResponse, HttpErrorResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap, finalize, catchError } from 'rxjs/operators';

import { EvaluationPerformanceService } from '../services/evaluation-performance.service';

/**
 * HTTP Interceptor for performance monitoring
 * 
 * @description This interceptor automatically tracks all HTTP requests
 * related to the evaluation discussion forum and provides performance
 * metrics including response times, success rates, and cache hit rates.
 * 
 * Features:
 * - Automatic request/response time tracking
 * - Cache hit detection
 * - Error rate monitoring
 * - Bandwidth usage estimation
 * - Request pattern analysis
 * 
 * @example
 * ```typescript
 * // In app.module.ts or evaluation forum module
 * {
 *   provide: HTTP_INTERCEPTORS,
 *   useClass: PerformanceInterceptor,
 *   multi: true
 * }
 * ```
 */
@Injectable({
  providedIn: 'root'
})
export class PerformanceInterceptor implements HttpInterceptor {

  constructor(private performanceService: EvaluationPerformanceService) {}

  /**
   * Intercepts HTTP requests and tracks performance metrics
   * 
   * @param request - The outgoing HTTP request
   * @param next - The next handler in the interceptor chain
   * @returns Observable of the HTTP event
   */
  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Only monitor evaluation-related requests
    if (!this.isEvaluationRequest(request.url)) {
      return next.handle(request);
    }

    const startTime = performance.now();
    let isFromCache = false;
    let responseSize = 0;

    // Add performance tracking headers
    const performanceRequest = request.clone({
      setHeaders: {
        'X-Performance-Tracking': 'enabled',
        'X-Request-Start': startTime.toString()
      }
    });

    console.log(`🌐 Starting request: ${request.method} ${request.url}`);

    return next.handle(performanceRequest).pipe(
      tap(event => {
        if (event instanceof HttpResponse) {
          // Calculate response metrics
          const endTime = performance.now();
          const duration = endTime - startTime;
          
          // Detect cache hits
          isFromCache = this.detectCacheHit(event);
          
          // Estimate response size
          responseSize = this.estimateResponseSize(event);
          
          // Log successful response
          console.log(`✅ Request completed: ${request.method} ${request.url}`, {
            duration: `${duration.toFixed(2)}ms`,
            status: event.status,
            fromCache: isFromCache,
            size: `${(responseSize / 1024).toFixed(2)}KB`
          });

          // Record performance metrics
          this.performanceService.recordNetworkRequest(
            request.url,
            duration,
            true,
            isFromCache
          );

          // Track specific evaluation patterns
          this.trackEvaluationPatterns(request, event, duration);
        }
      }),
      catchError((error: HttpErrorResponse) => {
        // Calculate error response time
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        console.error(`❌ Request failed: ${request.method} ${request.url}`, {
          duration: `${duration.toFixed(2)}ms`,
          status: error.status,
          error: error.message
        });

        // Record failed request
        this.performanceService.recordNetworkRequest(
          request.url,
          duration,
          false,
          false
        );

        // Track error patterns
        this.trackErrorPatterns(request, error);

        // Re-throw the error
        throw error;
      }),
      finalize(() => {
        // Cleanup any request-specific resources
        this.cleanupRequest(request);
      })
    );
  }

  // =============================================================================
  // REQUEST CLASSIFICATION
  // =============================================================================

  /**
   * Checks if the request is related to evaluation functionality
   * 
   * @param url - Request URL
   * @returns True if evaluation-related request
   */
  private isEvaluationRequest(url: string): boolean {
    const evaluationPatterns = [
      '/api/evaluation',
      '/api/submissions',
      '/api/comments',
      '/api/votes',
      '/api/categories',
      '/api/discussions'
    ];

    return evaluationPatterns.some(pattern => url.includes(pattern));
  }

  /**
   * Detects if response came from cache
   * 
   * @param response - HTTP response
   * @returns True if response was cached
   */
  private detectCacheHit(response: HttpResponse<any>): boolean {
    // Check various cache indicators
    const cacheControl = response.headers.get('cache-control');
    const age = response.headers.get('age');
    const etag = response.headers.get('etag');
    const lastModified = response.headers.get('last-modified');

    // If Age header exists and > 0, likely from cache
    if (age && parseInt(age, 10) > 0) {
      return true;
    }

    // Check for cache-control directives
    if (cacheControl && cacheControl.includes('max-age')) {
      return true;
    }

    // Browser cache detection (less reliable)
    if (etag || lastModified) {
      // Response with 304 Not Modified would indicate cache hit
      return response.status === 304;
    }

    return false;
  }

  /**
   * Estimates response size from headers and content
   * 
   * @param response - HTTP response
   * @returns Estimated size in bytes
   */
  private estimateResponseSize(response: HttpResponse<any>): number {
    // Try to get actual content length
    const contentLength = response.headers.get('content-length');
    if (contentLength) {
      return parseInt(contentLength, 10);
    }

    // Estimate from response body
    if (response.body) {
      try {
        const bodyString = JSON.stringify(response.body);
        return new Blob([bodyString]).size;
      } catch (error) {
        // Fallback estimation
        return this.estimateSizeByType(response.url, response.body);
      }
    }

    return 0;
  }

  /**
   * Estimates size based on request type and content
   * 
   * @param url - Request URL
   * @param body - Response body
   * @returns Estimated size in bytes
   */
  private estimateSizeByType(url: string, body: any): number {
    if (url.includes('/comments')) {
      // Estimate comment size: ~2KB per comment
      if (Array.isArray(body)) {
        return body.length * 2048;
      }
      return 2048;
    }

    if (url.includes('/submissions')) {
      // Estimate submission size: ~4KB per submission
      if (Array.isArray(body)) {
        return body.length * 4096;
      }
      return 4096;
    }

    if (url.includes('/users')) {
      // Estimate user data: ~1KB per user
      if (Array.isArray(body)) {
        return body.length * 1024;
      }
      return 1024;
    }

    // Default estimation
    return 512;
  }

  // =============================================================================
  // PATTERN TRACKING
  // =============================================================================

  /**
   * Tracks specific evaluation request patterns
   * 
   * @param request - HTTP request
   * @param response - HTTP response
   * @param duration - Request duration
   */
  private trackEvaluationPatterns(
    request: HttpRequest<any>, 
    response: HttpResponse<any>, 
    duration: number
  ): void {
    const url = request.url;

    // Track comment loading patterns
    if (url.includes('/comments')) {
      this.trackCommentLoadingPattern(request, response, duration);
    }

    // Track submission access patterns
    if (url.includes('/submissions')) {
      this.trackSubmissionAccessPattern(request, response, duration);
    }

    // Track voting patterns
    if (url.includes('/votes') && request.method === 'POST') {
      this.trackVotingPattern(request, response, duration);
    }

    // Track search patterns
    if (url.includes('search') || request.params.has('query')) {
      this.trackSearchPattern(request, response, duration);
    }
  }

  /**
   * Tracks comment loading performance patterns
   * 
   * @param request - HTTP request
   * @param response - HTTP response
   * @param duration - Request duration
   */
  private trackCommentLoadingPattern(
    request: HttpRequest<any>, 
    response: HttpResponse<any>, 
    duration: number
  ): void {
    const commentsCount = Array.isArray(response.body) ? response.body.length : 1;
    const avgTimePerComment = duration / commentsCount;

    console.log(`💬 Comment loading pattern:`, {
      count: commentsCount,
      totalTime: `${duration.toFixed(2)}ms`,
      avgPerComment: `${avgTimePerComment.toFixed(2)}ms`
    });

    // Alert if comment loading is slow
    if (avgTimePerComment > 50) {
      console.warn(`⚠️ Slow comment loading detected: ${avgTimePerComment.toFixed(2)}ms per comment`);
    }
  }

  /**
   * Tracks submission access patterns
   * 
   * @param request - HTTP request
   * @param response - HTTP response
   * @param duration - Request duration
   */
  private trackSubmissionAccessPattern(
    request: HttpRequest<any>, 
    response: HttpResponse<any>, 
    duration: number
  ): void {
    const submissionId = this.extractSubmissionId(request.url);
    
    console.log(`📝 Submission access pattern:`, {
      submissionId,
      duration: `${duration.toFixed(2)}ms`,
      method: request.method
    });

    // Track if submission loading is becoming slower over time
    if (duration > 1000) {
      console.warn(`⚠️ Slow submission loading: ${submissionId} took ${duration.toFixed(2)}ms`);
    }
  }

  /**
   * Tracks voting performance patterns
   * 
   * @param request - HTTP request
   * @param response - HTTP response
   * @param duration - Request duration
   */
  private trackVotingPattern(
    request: HttpRequest<any>, 
    response: HttpResponse<any>, 
    duration: number
  ): void {
    console.log(`👍 Voting pattern:`, {
      duration: `${duration.toFixed(2)}ms`,
      success: response.status === 200
    });

    // Voting should be fast for good UX
    if (duration > 500) {
      console.warn(`⚠️ Slow voting response: ${duration.toFixed(2)}ms`);
    }
  }

  /**
   * Tracks search performance patterns
   * 
   * @param request - HTTP request
   * @param response - HTTP response
   * @param duration - Request duration
   */
  private trackSearchPattern(
    request: HttpRequest<any>, 
    response: HttpResponse<any>, 
    duration: number
  ): void {
    const query = request.params.get('query') || '';
    const resultsCount = Array.isArray(response.body) ? response.body.length : 0;

    console.log(`🔍 Search pattern:`, {
      query: query.substring(0, 20) + (query.length > 20 ? '...' : ''),
      results: resultsCount,
      duration: `${duration.toFixed(2)}ms`
    });

    // Search should be reasonably fast
    if (duration > 2000) {
      console.warn(`⚠️ Slow search query: "${query}" took ${duration.toFixed(2)}ms`);
    }
  }

  // =============================================================================
  // ERROR TRACKING
  // =============================================================================

  /**
   * Tracks error patterns for analysis
   * 
   * @param request - Failed HTTP request
   * @param error - HTTP error response
   */
  private trackErrorPatterns(request: HttpRequest<any>, error: HttpErrorResponse): void {
    const errorPattern = {
      url: request.url,
      method: request.method,
      status: error.status,
      message: error.message,
      timestamp: Date.now()
    };

    console.error(`🔥 Error pattern tracked:`, errorPattern);

    // Track specific error types
    switch (error.status) {
      case 404:
        this.trackResourceNotFoundError(request, error);
        break;
      case 403:
        this.trackForbiddenError(request, error);
        break;
      case 500:
        this.trackServerError(request, error);
        break;
      case 0:
        this.trackNetworkError(request, error);
        break;
    }
  }

  /**
   * Tracks 404 resource not found errors
   */
  private trackResourceNotFoundError(request: HttpRequest<any>, error: HttpErrorResponse): void {
    console.warn(`🔍 Resource not found: ${request.method} ${request.url}`);
    
    // Check if it's a submission or comment that doesn't exist
    if (request.url.includes('/submissions/') || request.url.includes('/comments/')) {
      console.warn(`⚠️ Potential data inconsistency detected in: ${request.url}`);
    }
  }

  /**
   * Tracks 403 forbidden errors
   */
  private trackForbiddenError(request: HttpRequest<any>, error: HttpErrorResponse): void {
    console.warn(`🔒 Access forbidden: ${request.method} ${request.url}`);
    
    // This could indicate permission issues or session expiry
    if (request.url.includes('/evaluation/')) {
      console.warn(`⚠️ Potential evaluation access issue detected`);
    }
  }

  /**
   * Tracks 500 server errors
   */
  private trackServerError(request: HttpRequest<any>, error: HttpErrorResponse): void {
    console.error(`🚨 Server error: ${request.method} ${request.url}`);
    
    // Server errors could indicate backend issues
    console.error(`🔧 Backend issue detected for: ${request.url}`);
  }

  /**
   * Tracks network connectivity errors
   */
  private trackNetworkError(request: HttpRequest<any>, error: HttpErrorResponse): void {
    console.error(`📡 Network error: ${request.method} ${request.url}`);
    
    // Network errors could indicate connectivity issues
    console.warn(`⚠️ Network connectivity issue detected`);
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  /**
   * Extracts submission ID from URL
   * 
   * @param url - Request URL
   * @returns Submission ID or null
   */
  private extractSubmissionId(url: string): string | null {
    const match = url.match(/\/submissions\/([a-zA-Z0-9\-]+)/);
    return match ? match[1] : null;
  }

  /**
   * Cleans up request-specific resources
   * 
   * @param request - HTTP request to clean up
   */
  private cleanupRequest(request: HttpRequest<any>): void {
    // Clean up any request-specific resources
    // This could include clearing temporary caches, aborting related operations, etc.
    
    // Currently no cleanup needed, but method is available for future use
  }
}

// =============================================================================
// PERFORMANCE INTERCEPTOR PROVIDER
// =============================================================================

/**
 * Provider configuration for the performance interceptor
 */
export const PERFORMANCE_INTERCEPTOR_PROVIDER = {
  provide: 'HTTP_INTERCEPTORS',
  useClass: PerformanceInterceptor,
  multi: true
};