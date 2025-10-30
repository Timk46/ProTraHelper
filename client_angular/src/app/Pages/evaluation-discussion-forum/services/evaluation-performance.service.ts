import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map, filter } from 'rxjs/operators';

/**
 * Performance monitoring service for the evaluation discussion forum
 * 
 * @description This service provides comprehensive performance monitoring
 * for the evaluation discussion forum. It tracks component rendering times,
 * memory usage, network performance, and user experience metrics.
 * 
 * Key Features:
 * - Component performance profiling
 * - Memory leak detection
 * - Network performance monitoring
 * - Web Vitals tracking (CLS, LCP, FID)
 * - Bundle size analysis
 * - Real-time performance dashboard
 * 
 * @example
 * ```typescript
 * constructor(private performanceService: EvaluationPerformanceService) {
 *   this.performanceService.startComponentProfiling('discussion-thread');
 *   
 *   // Track component lifecycle
 *   this.performanceService.markComponentInit('comment-item', Date.now());
 * }
 * ```
 */
@Injectable({
  providedIn: 'root'
})
export class EvaluationPerformanceService {

  // =============================================================================
  // PERFORMANCE STATE
  // =============================================================================

  private performanceMetricsSubject = new BehaviorSubject<PerformanceMetrics>({
    componentMetrics: new Map(),
    networkMetrics: {
      totalRequests: 0,
      averageResponseTime: 0,
      failedRequests: 0,
      cacheHitRate: 0,
      bandwidthUsage: 0
    },
    memoryMetrics: {
      usedJSHeapSize: 0,
      totalJSHeapSize: 0,
      jsHeapSizeLimit: 0,
      memoryPressure: 'low',
      leakCount: 0
    },
    webVitals: {
      cls: 0, // Cumulative Layout Shift
      lcp: 0, // Largest Contentful Paint
      fid: 0, // First Input Delay
      fcp: 0, // First Contentful Paint
      ttfb: 0 // Time to First Byte
    },
    bundleMetrics: {
      mainBundleSize: 0,
      chunkCount: 0,
      lazyLoadedModules: 0,
      unusedCode: 0
    },
    timestamp: Date.now()
  });

  private componentProfilingMap = new Map<string, ComponentProfiling>();
  private performanceObserver?: PerformanceObserver;
  private memoryMonitoringInterval?: number;
  private isProfilingActive = false;

  constructor() {
    this.initializePerformanceMonitoring();
    this.startMemoryMonitoring();
    this.setupWebVitalsTracking();
  }

  // =============================================================================
  // PUBLIC OBSERVABLES
  // =============================================================================

  /**
   * Observable for performance metrics changes
   */
  get performanceMetrics$(): Observable<PerformanceMetrics> {
    return this.performanceMetricsSubject.asObservable();
  }

  /**
   * Updates performance metrics for external components
   * 
   * @description Public wrapper method for updating performance metrics
   * from external components. This method delegates to the appropriate
   * internal metric updating methods based on the type of metric.
   * 
   * @param {number} metricValue - The metric value to record
   * @param {boolean} isRenderTime - Whether this is a render time metric
   * @memberof EvaluationPerformanceService
   */
  updatePerformanceMetrics(metricValue: number, isRenderTime: boolean = false): void {
    if (isRenderTime) {
      // Find the most recently started component profiling to update
      const activeProfilings = Array.from(this.componentProfilingMap.entries())
        .filter(([_, profiling]) => profiling.isActive);
      
      if (activeProfilings.length > 0) {
        const [componentName, profiling] = activeProfilings[0];
        profiling.renderTimes.push(metricValue);
        profiling.averageRenderTime = profiling.renderTimes.reduce((a: number, b: number) => a + b, 0) / profiling.renderTimes.length;
        profiling.maxRenderTime = Math.max(profiling.maxRenderTime, metricValue);
        
        this.updateComponentMetrics(componentName, profiling);
      }
    } else {
      // Generic metric update - record as network request
      this.recordNetworkRequest('generic-metric', metricValue, true);
    }
  }

  /**
   * Observable for memory metrics only
   */
  get memoryMetrics$(): Observable<MemoryMetrics> {
    return this.performanceMetrics$.pipe(
      map(metrics => metrics.memoryMetrics),
      filter(Boolean)
    );
  }

  /**
   * Observable for network performance
   */
  get networkMetrics$(): Observable<NetworkMetrics> {
    return this.performanceMetrics$.pipe(
      map(metrics => metrics.networkMetrics),
      filter(Boolean)
    );
  }

  /**
   * Observable for Web Vitals
   */
  get webVitals$(): Observable<WebVitals> {
    return this.performanceMetrics$.pipe(
      map(metrics => metrics.webVitals),
      filter(Boolean)
    );
  }

  // =============================================================================
  // COMPONENT PERFORMANCE PROFILING
  // =============================================================================

  /**
   * Starts profiling for a specific component
   * 
   * @param componentName - Name of the component to profile
   * @param options - Profiling configuration options
   */
  startComponentProfiling(componentName: string, options: ProfilingOptions = {}): void {
    if (this.componentProfilingMap.has(componentName)) {
      return;
    }

    const profiling: ComponentProfiling = {
      componentName,
      startTime: performance.now(),
      renderCount: 0,
      totalRenderTime: 0,
      averageRenderTime: 0,
      maxRenderTime: 0,
      renderTimes: [],
      changeDetectionCycles: 0,
      memorySnapshot: this.getCurrentMemoryUsage(),
      isActive: true,
      options: {
        trackMemory: options.trackMemory ?? true,
        trackChangeDetection: options.trackChangeDetection ?? true,
        sampleRate: options.sampleRate ?? 1.0
      }
    };

    this.componentProfilingMap.set(componentName, profiling);
  }

  /**
   * Stops profiling for a component
   *
   * @param componentName - Name of the component to stop profiling
   */
  stopComponentProfiling(componentName: string): ComponentProfiling | null {
    const profiling = this.componentProfilingMap.get(componentName);
    if (!profiling) {
      return null;
    }

    profiling.endTime = performance.now();
    profiling.totalDuration = profiling.endTime - profiling.startTime;
    profiling.isActive = false;

    // Update performance metrics
    this.updateComponentMetrics(componentName, profiling);

    return profiling;
  }

  /**
   * Comprehensive component monitoring setup (high-level API)
   *
   * @description Automatically sets up complete monitoring for a component including:
   * - Component profiling
   * - Render time tracking
   * - Memory monitoring
   * - Change detection tracking
   *
   * This method orchestrates all monitoring tasks and provides a simple API for components.
   *
   * @param componentName - Unique identifier for the component
   * @param config - Monitoring configuration
   * @param config.componentRef - Reference to component instance
   * @param config.viewModel$ - Observable for tracking view model updates
   * @param config.destroy$ - Destroy subject for cleanup
   * @param config.options - Optional monitoring settings
   *
   * @example
   * ```typescript
   * ngOnInit() {
   *   this.performanceService.monitorComponent('my-component', {
   *     componentRef: this,
   *     viewModel$: this.viewModel$,
   *     destroy$: this.destroy$,
   *     options: {
   *       trackMemory: true,
   *       renderTimeThreshold: 100
   *     }
   *   });
   * }
   * ```
   */
  monitorComponent(componentName: string, config: {
    componentRef: any;
    viewModel$: Observable<any>;
    destroy$: Observable<void>;
    options?: {
      trackMemory?: boolean;
      trackChangeDetection?: boolean;
      trackRenderTime?: boolean;
      memoryThreshold?: number;
      renderTimeThreshold?: number;
    };
  }): void {
    const startTime = performance.now();

    // Default options
    const options = {
      trackMemory: config.options?.trackMemory ?? true,
      trackChangeDetection: config.options?.trackChangeDetection ?? true,
      trackRenderTime: config.options?.trackRenderTime ?? true,
      memoryThreshold: config.options?.memoryThreshold ?? 100 * 1024 * 1024, // 100MB
      renderTimeThreshold: config.options?.renderTimeThreshold ?? 100 // ms
    };

    // Start component profiling
    this.startComponentProfiling(componentName, {
      trackMemory: options.trackMemory,
      trackChangeDetection: options.trackChangeDetection,
      sampleRate: 1.0
    });

    // Mark component initialization
    this.markComponentInit(componentName, startTime);

    // Track render performance via viewModel updates
    if (options.trackRenderTime) {
      config.viewModel$.subscribe(() => {
        const renderTime = performance.now() - startTime;
        this.markRenderEnd(componentName);

        if (renderTime > options.renderTimeThreshold) {
          console.warn(
            `[Performance] Slow render detected in ${componentName}: ${renderTime.toFixed(2)}ms`
          );
        }
      });
    }

    // Setup cleanup on component destroy
    config.destroy$.subscribe(() => {
      this.stopComponentProfiling(componentName);
    });
  }

  /**
   * Marks a component initialization event
   * 
   * @param componentName - Component name
   * @param timestamp - Event timestamp
   */
  markComponentInit(componentName: string, timestamp: number = performance.now()): void {
    const profiling = this.componentProfilingMap.get(componentName);
    if (profiling) {
      profiling.initTime = timestamp;
    }

    // Mark performance event
    performance.mark(`component-init-${componentName}`);
  }

  /**
   * Marks a component render start
   * 
   * @param componentName - Component name
   */
  markRenderStart(componentName: string): void {
    const profiling = this.componentProfilingMap.get(componentName);
    if (profiling && Math.random() <= (profiling.options.sampleRate ?? 1.0)) {
      profiling.currentRenderStart = performance.now();
    }

    performance.mark(`render-start-${componentName}`);
  }

  /**
   * Marks a component render end and calculates metrics
   * 
   * @param componentName - Component name
   */
  markRenderEnd(componentName: string): void {
    const profiling = this.componentProfilingMap.get(componentName);
    if (profiling && profiling.currentRenderStart) {
      const renderTime = performance.now() - profiling.currentRenderStart;
      
      profiling.renderCount++;
      profiling.totalRenderTime += renderTime;
      profiling.averageRenderTime = profiling.totalRenderTime / profiling.renderCount;
      profiling.maxRenderTime = Math.max(profiling.maxRenderTime, renderTime);
      
      // Track memory if enabled
      if (profiling.options.trackMemory) {
        const currentMemory = this.getCurrentMemoryUsage();
        profiling.memoryDelta = currentMemory - profiling.memorySnapshot;
      }

      profiling.currentRenderStart = undefined;
    }

    performance.mark(`render-end-${componentName}`);
    performance.measure(`render-duration-${componentName}`, 
      `render-start-${componentName}`, 
      `render-end-${componentName}`
    );
  }

  /**
   * Marks a change detection cycle
   * 
   * @param componentName - Component name
   */
  markChangeDetection(componentName: string): void {
    const profiling = this.componentProfilingMap.get(componentName);
    if (profiling) {
      profiling.changeDetectionCycles++;
    }
  }

  // =============================================================================
  // MEMORY MONITORING
  // =============================================================================

  /**
   * Gets current memory usage from Performance API
   * 
   * @returns Current memory usage in bytes
   */
  getCurrentMemoryUsage(): number {
    if ('memory' in performance && (performance as any).memory) {
      return (performance as any).memory.usedJSHeapSize;
    }
    return 0;
  }

  /**
   * Detects potential memory leaks
   * 
   * @returns Array of potential memory leak warnings
   */
  detectMemoryLeaks(): MemoryLeakWarning[] {
    const warnings: MemoryLeakWarning[] = [];
    const currentMemory = this.getCurrentMemoryUsage();
    const memoryThreshold = 50 * 1024 * 1024; // 50MB threshold

    // Check for excessive memory growth
    if (currentMemory > memoryThreshold) {
      warnings.push({
        type: 'high_memory_usage',
        severity: 'warning',
        message: `High memory usage detected: ${(currentMemory / 1024 / 1024).toFixed(2)}MB`,
        timestamp: Date.now()
      });
    }

    // Check component profiling for memory leaks
    this.componentProfilingMap.forEach((profiling, componentName) => {
      if (profiling.memoryDelta && profiling.memoryDelta > 5 * 1024 * 1024) { // 5MB
        warnings.push({
          type: 'component_memory_leak',
          severity: 'error',
          message: `Potential memory leak in ${componentName}: +${(profiling.memoryDelta / 1024 / 1024).toFixed(2)}MB`,
          componentName,
          timestamp: Date.now()
        });
      }
    });

    return warnings;
  }

  // =============================================================================
  // NETWORK PERFORMANCE MONITORING
  // =============================================================================

  /**
   * Records network request performance
   * 
   * @param url - Request URL
   * @param duration - Request duration in milliseconds
   * @param success - Whether request was successful
   * @param fromCache - Whether response came from cache
   */
  recordNetworkRequest(url: string, duration: number, success: boolean, fromCache: boolean = false): void {
    const currentMetrics = this.performanceMetricsSubject.value;
    const networkMetrics = currentMetrics.networkMetrics;

    const newTotalRequests = networkMetrics.totalRequests + 1;
    const newFailedRequests = success ? networkMetrics.failedRequests : networkMetrics.failedRequests + 1;
    const newAverageResponseTime = ((networkMetrics.averageResponseTime * networkMetrics.totalRequests) + duration) / newTotalRequests;
    const cacheHits = fromCache ? networkMetrics.totalRequests * networkMetrics.cacheHitRate + 1 : networkMetrics.totalRequests * networkMetrics.cacheHitRate;
    const newCacheHitRate = cacheHits / newTotalRequests;

    this.updateNetworkMetrics({
      totalRequests: newTotalRequests,
      averageResponseTime: newAverageResponseTime,
      failedRequests: newFailedRequests,
      cacheHitRate: newCacheHitRate,
      bandwidthUsage: networkMetrics.bandwidthUsage + this.estimateBandwidth(url)
    });

  }

  /**
   * Estimates bandwidth usage for a request
   * 
   * @param url - Request URL
   * @returns Estimated bandwidth in bytes
   */
  private estimateBandwidth(url: string): number {
    // Simple estimation based on URL patterns
    if (url.includes('/api/comments')) return 2048; // ~2KB per comment
    if (url.includes('/api/submissions')) return 4096; // ~4KB per submission
    if (url.includes('/api/users')) return 1024; // ~1KB per user
    return 512; // Default estimation
  }

  // =============================================================================
  // WEB VITALS TRACKING
  // =============================================================================

  /**
   * Sets up Web Vitals tracking using Performance Observer
   */
  private setupWebVitalsTracking(): void {
    if ('PerformanceObserver' in window) {
      // Track Largest Contentful Paint (LCP)
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lcpEntry = entries[entries.length - 1] as PerformanceEntry;
          this.updateWebVitals({ lcp: lcpEntry.startTime });
        });
        lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
      } catch (error) {
        console.warn('LCP observer not supported:', error);
      }

      // Track First Input Delay (FID)
      try {
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries() as PerformanceEntry[];
          entries.forEach((entry: any) => {
            this.updateWebVitals({ fid: entry.processingStart - entry.startTime });
          });
        });
        fidObserver.observe({ type: 'first-input', buffered: true });
      } catch (error) {
        console.warn('FID observer not supported:', error);
      }

      // Track Cumulative Layout Shift (CLS)
      try {
        const clsObserver = new PerformanceObserver((list) => {
          let clsScore = 0;
          const entries = list.getEntries() as PerformanceEntry[];
          entries.forEach((entry: any) => {
            if (!entry.hadRecentInput) {
              clsScore += entry.value;
            }
          });
          this.updateWebVitals({ cls: clsScore });
        });
        clsObserver.observe({ type: 'layout-shift', buffered: true });
      } catch (error) {
        console.warn('CLS observer not supported:', error);
      }
    }

    // Track First Contentful Paint (FCP) and Time to First Byte (TTFB)
    window.addEventListener('load', () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navigation) {
        this.updateWebVitals({
          fcp: navigation.loadEventEnd - navigation.fetchStart,
          ttfb: navigation.responseStart - navigation.fetchStart
        });
      }
    });
  }

  // =============================================================================
  // BUNDLE SIZE ANALYSIS
  // =============================================================================

  /**
   * Analyzes bundle size and lazy loading performance
   */
  analyzeBundlePerformance(): void {
    const bundleMetrics: BundleMetrics = {
      mainBundleSize: 0,
      chunkCount: 0,
      lazyLoadedModules: 0,
      unusedCode: 0
    };

    // Estimate bundle size from loaded resources
    if ('performance' in window) {
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      
      resources.forEach(resource => {
        if (resource.name.includes('.js')) {
          bundleMetrics.mainBundleSize += resource.transferSize || 0;
          bundleMetrics.chunkCount++;
        }
      });
    }

    this.updateBundleMetrics(bundleMetrics);
    console.log('📦 Bundle analysis completed:', bundleMetrics);
  }

  // =============================================================================
  // PERFORMANCE DASHBOARD
  // =============================================================================

  /**
   * Gets performance summary for dashboard
   * 
   * @returns Performance summary object
   */
  getPerformanceSummary(): PerformanceSummary {
    const metrics = this.performanceMetricsSubject.value;
    const memoryWarnings = this.detectMemoryLeaks();

    return {
      overall: this.calculateOverallScore(metrics),
      components: Array.from(this.componentProfilingMap.values()),
      memoryHealth: memoryWarnings.length === 0 ? 'good' : memoryWarnings.some(w => w.severity === 'error') ? 'critical' : 'warning',
      networkHealth: metrics.networkMetrics.failedRequests / Math.max(metrics.networkMetrics.totalRequests, 1) < 0.05 ? 'good' : 'warning',
      recommendations: this.generateRecommendations(metrics, memoryWarnings),
      timestamp: Date.now()
    };
  }

  /**
   * Logs performance report to console
   */
  logPerformanceReport(): void {
    const summary = this.getPerformanceSummary();
    
    console.group('🚀 Performance Report');
    console.log('Overall Score:', summary.overall);
    console.log('Memory Health:', summary.memoryHealth);
    console.log('Network Health:', summary.networkHealth);
    
    if (summary.components.length > 0) {
      console.group('Component Performance');
      summary.components.forEach(component => {
        console.log(`${component.componentName}:`, {
          renders: component.renderCount,
          avgTime: `${component.averageRenderTime.toFixed(2)}ms`,
          maxTime: `${component.maxRenderTime.toFixed(2)}ms`
        });
      });
      console.groupEnd();
    }

    if (summary.recommendations.length > 0) {
      console.group('Recommendations');
      summary.recommendations.forEach(rec => console.log(rec));
      console.groupEnd();
    }
    
    console.groupEnd();
  }

  // =============================================================================
  // PRIVATE METHODS
  // =============================================================================

  /**
   * Initializes performance monitoring systems
   */
  private initializePerformanceMonitoring(): void {
    this.isProfilingActive = true;

    // ⚡ PERFORMANCE: Defer cleanup interval start
    setTimeout(() => {
      setInterval(() => {
        this.cleanupPerformanceMarks();
      }, 60000); // Cleanup every minute
    }, 60000); // Start after 60 seconds
  }

  /**
   * Starts memory monitoring interval
   */
  private startMemoryMonitoring(): void {
    this.memoryMonitoringInterval = window.setInterval(() => {
      this.updateMemoryMetrics();
    }, 5000); // Check every 5 seconds
  }

  /**
   * Updates component metrics in the performance state
   * 
   * @param componentName - Component name
   * @param profiling - Profiling data
   */
  private updateComponentMetrics(componentName: string, profiling: ComponentProfiling): void {
    const currentMetrics = this.performanceMetricsSubject.value;
    const newComponentMetrics = new Map(currentMetrics.componentMetrics);
    
    newComponentMetrics.set(componentName, profiling);
    
    this.performanceMetricsSubject.next({
      ...currentMetrics,
      componentMetrics: newComponentMetrics,
      timestamp: Date.now()
    });
  }

  /**
   * Updates memory metrics
   */
  private updateMemoryMetrics(): void {
    if ('memory' in performance && (performance as any).memory) {
      const memory = (performance as any).memory;
      const currentMetrics = this.performanceMetricsSubject.value;
      
      const memoryMetrics: MemoryMetrics = {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
        memoryPressure: this.calculateMemoryPressure(memory.usedJSHeapSize, memory.jsHeapSizeLimit),
        leakCount: this.detectMemoryLeaks().length
      };

      this.performanceMetricsSubject.next({
        ...currentMetrics,
        memoryMetrics,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Updates network metrics
   * 
   * @param networkMetrics - New network metrics
   */
  private updateNetworkMetrics(networkMetrics: NetworkMetrics): void {
    const currentMetrics = this.performanceMetricsSubject.value;
    this.performanceMetricsSubject.next({
      ...currentMetrics,
      networkMetrics,
      timestamp: Date.now()
    });
  }

  /**
   * Updates Web Vitals metrics
   * 
   * @param vitals - Web Vitals to update
   */
  private updateWebVitals(vitals: Partial<WebVitals>): void {
    const currentMetrics = this.performanceMetricsSubject.value;
    this.performanceMetricsSubject.next({
      ...currentMetrics,
      webVitals: {
        ...currentMetrics.webVitals,
        ...vitals
      },
      timestamp: Date.now()
    });
  }

  /**
   * Updates bundle metrics
   * 
   * @param bundleMetrics - New bundle metrics
   */
  private updateBundleMetrics(bundleMetrics: BundleMetrics): void {
    const currentMetrics = this.performanceMetricsSubject.value;
    this.performanceMetricsSubject.next({
      ...currentMetrics,
      bundleMetrics,
      timestamp: Date.now()
    });
  }

  /**
   * Calculates memory pressure level
   * 
   * @param used - Used memory in bytes
   * @param limit - Memory limit in bytes
   * @returns Memory pressure level
   */
  private calculateMemoryPressure(used: number, limit: number): 'low' | 'medium' | 'high' | 'critical' {
    const ratio = used / limit;
    if (ratio > 0.9) return 'critical';
    if (ratio > 0.75) return 'high';
    if (ratio > 0.5) return 'medium';
    return 'low';
  }

  /**
   * Calculates overall performance score
   * 
   * @param metrics - Performance metrics
   * @returns Overall score (0-100)
   */
  private calculateOverallScore(metrics: PerformanceMetrics): number {
    let score = 100;

    // Deduct points for high memory usage
    if (metrics.memoryMetrics.memoryPressure === 'high') score -= 20;
    if (metrics.memoryMetrics.memoryPressure === 'critical') score -= 40;

    // Deduct points for network issues
    const failureRate = metrics.networkMetrics.failedRequests / Math.max(metrics.networkMetrics.totalRequests, 1);
    score -= failureRate * 30;

    // Deduct points for poor Web Vitals
    if (metrics.webVitals.lcp > 2500) score -= 10;
    if (metrics.webVitals.fid > 100) score -= 10;
    if (metrics.webVitals.cls > 0.1) score -= 10;

    return Math.max(0, score);
  }

  /**
   * Generates performance recommendations
   * 
   * @param metrics - Performance metrics
   * @param memoryWarnings - Memory leak warnings
   * @returns Array of recommendations
   */
  private generateRecommendations(metrics: PerformanceMetrics, memoryWarnings: MemoryLeakWarning[]): string[] {
    const recommendations: string[] = [];

    // Memory recommendations
    if (metrics.memoryMetrics.memoryPressure === 'high' || metrics.memoryMetrics.memoryPressure === 'critical') {
      recommendations.push('Consider implementing more aggressive cache eviction strategies');
      recommendations.push('Review component subscriptions for proper cleanup');
    }

    // Network recommendations
    if (metrics.networkMetrics.averageResponseTime > 1000) {
      recommendations.push('Optimize API response times or implement request caching');
    }

    if (metrics.networkMetrics.cacheHitRate < 0.5) {
      recommendations.push('Improve caching strategy to reduce network requests');
    }

    // Web Vitals recommendations
    if (metrics.webVitals.lcp > 2500) {
      recommendations.push('Optimize largest contentful paint by reducing image sizes or using lazy loading');
    }

    if (metrics.webVitals.cls > 0.1) {
      recommendations.push('Reduce cumulative layout shift by providing fixed dimensions for dynamic content');
    }

    // Component-specific recommendations
    metrics.componentMetrics.forEach((profiling, componentName) => {
      if (profiling.averageRenderTime > 16) { // 60 FPS threshold
        recommendations.push(`Optimize ${componentName} component rendering (avg: ${profiling.averageRenderTime.toFixed(2)}ms)`);
      }
    });

    return recommendations;
  }

  /**
   * Cleans up old performance marks and measures
   */
  private cleanupPerformanceMarks(): void {
    try {
      const marks = performance.getEntriesByType('mark');
      const measures = performance.getEntriesByType('measure');
      
      // Clean up marks older than 5 minutes
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      
      marks.forEach(mark => {
        if (mark.startTime < fiveMinutesAgo) {
          performance.clearMarks(mark.name);
        }
      });

      measures.forEach(measure => {
        if (measure.startTime < fiveMinutesAgo) {
          performance.clearMeasures(measure.name);
        }
      });
    } catch (error) {
      console.warn('Error cleaning up performance marks:', error);
    }
  }

  // =============================================================================
  // CLEANUP
  // =============================================================================

  /**
   * Cleans up performance monitoring
   */
  destroy(): void {
    console.log('🛑 Destroying performance monitoring service');
    
    this.isProfilingActive = false;
    
    if (this.memoryMonitoringInterval) {
      clearInterval(this.memoryMonitoringInterval);
    }
    
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }
    
    this.componentProfilingMap.clear();
    this.performanceMetricsSubject.complete();
  }
}

// =============================================================================
// INTERFACES
// =============================================================================

export interface PerformanceMetrics {
  componentMetrics: Map<string, ComponentProfiling>;
  networkMetrics: NetworkMetrics;
  memoryMetrics: MemoryMetrics;
  webVitals: WebVitals;
  bundleMetrics: BundleMetrics;
  timestamp: number;
}

export interface ComponentProfiling {
  componentName: string;
  startTime: number;
  endTime?: number;
  totalDuration?: number;
  initTime?: number;
  renderCount: number;
  totalRenderTime: number;
  averageRenderTime: number;
  maxRenderTime: number;
  renderTimes: number[];
  changeDetectionCycles: number;
  memorySnapshot: number;
  memoryDelta?: number;
  currentRenderStart?: number;
  isActive: boolean;
  options: ProfilingOptions;
}

export interface ProfilingOptions {
  trackMemory?: boolean;
  trackChangeDetection?: boolean;
  sampleRate?: number;
}

export interface NetworkMetrics {
  totalRequests: number;
  averageResponseTime: number;
  failedRequests: number;
  cacheHitRate: number;
  bandwidthUsage: number;
}

export interface MemoryMetrics {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  memoryPressure: 'low' | 'medium' | 'high' | 'critical';
  leakCount: number;
}

export interface WebVitals {
  cls: number; // Cumulative Layout Shift
  lcp: number; // Largest Contentful Paint
  fid: number; // First Input Delay
  fcp: number; // First Contentful Paint
  ttfb: number; // Time to First Byte
}

export interface BundleMetrics {
  mainBundleSize: number;
  chunkCount: number;
  lazyLoadedModules: number;
  unusedCode: number;
}

export interface MemoryLeakWarning {
  type: 'high_memory_usage' | 'component_memory_leak' | 'subscription_leak';
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  componentName?: string;
  timestamp: number;
}

export interface PerformanceSummary {
  overall: number;
  components: ComponentProfiling[];
  memoryHealth: 'good' | 'warning' | 'critical';
  networkHealth: 'good' | 'warning' | 'critical';
  recommendations: string[];
  timestamp: number;
}