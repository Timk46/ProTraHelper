import { 
  Directive, 
  Input, 
  OnInit, 
  OnDestroy, 
  AfterViewInit,
  DoCheck,
  ElementRef,
  NgZone,
  ChangeDetectorRef
} from '@angular/core';

import { EvaluationPerformanceService } from '../services/evaluation-performance.service';

/**
 * Directive for automatic component performance profiling
 * 
 * @description This directive automatically profiles Angular components
 * by hooking into their lifecycle events and tracking performance metrics
 * such as initialization time, render time, and change detection cycles.
 * 
 * Features:
 * - Automatic lifecycle event tracking
 * - Render time measurement
 * - Change detection cycle counting
 * - Memory usage monitoring
 * - DOM interaction tracking
 * 
 * @example
 * ```html
 * <div 
 *   appPerformanceProfiling="discussion-thread"
 *   [profilingOptions]="{trackMemory: true, sampleRate: 0.1}">
 *   <!-- Component content -->
 * </div>
 * ```
 */
@Directive({
  selector: '[appPerformanceProfiling]',
  standalone: true
})
export class PerformanceProfilingDirective implements OnInit, OnDestroy, AfterViewInit, DoCheck {
  
  @Input('appPerformanceProfiling') componentName!: string;
  @Input() profilingOptions: ProfilingDirectiveOptions = {};

  private changeDetectionCount = 0;
  private isViewInitialized = false;
  private mutationObserver?: MutationObserver;
  private resizeObserver?: ResizeObserver;
  private intersectionObserver?: IntersectionObserver;
  private performanceStartTime?: number;
  private domChangeCount = 0;

  constructor(
    private elementRef: ElementRef,
    private performanceService: EvaluationPerformanceService,
    private ngZone: NgZone,
    private changeDetectorRef: ChangeDetectorRef
  ) {}

  // =============================================================================
  // LIFECYCLE HOOKS
  // =============================================================================

  /**
   * Component initialization hook
   */
  ngOnInit(): void {
    if (!this.componentName) {
      console.warn('⚠️ Performance profiling directive requires componentName input');
      return;
    }

    this.performanceStartTime = performance.now();
    
    // Start component profiling
    this.performanceService.startComponentProfiling(this.componentName, {
      trackMemory: this.profilingOptions.trackMemory ?? true,
      trackChangeDetection: this.profilingOptions.trackChangeDetection ?? true,
      sampleRate: this.profilingOptions.sampleRate ?? 1.0
    });

    // Mark component initialization
    this.performanceService.markComponentInit(this.componentName, this.performanceStartTime);

    console.log(`🎯 Started profiling component: ${this.componentName}`);
  }

  /**
   * After view initialization hook
   */
  ngAfterViewInit(): void {
    this.isViewInitialized = true;
    
    // Set up DOM monitoring
    this.setupDOMMonitoring();
    this.setupVisibilityMonitoring();
    
    // Mark initial render completion
    if (this.performanceStartTime) {
      const initTime = performance.now() - this.performanceStartTime;
      console.log(`✅ Component ${this.componentName} initialized in ${initTime.toFixed(2)}ms`);
    }
  }

  /**
   * Change detection hook
   */
  ngDoCheck(): void {
    if (!this.isViewInitialized) return;

    this.changeDetectionCount++;
    
    // Track change detection cycles
    this.performanceService.markChangeDetection(this.componentName);
    
    // Sample change detection performance
    if (this.shouldSamplePerformance()) {
      this.measureRenderPerformance();
    }
  }

  /**
   * Component destruction hook
   */
  ngOnDestroy(): void {
    // Stop component profiling
    const profiling = this.performanceService.stopComponentProfiling(this.componentName);
    
    if (profiling) {
      console.log(`🏁 Profiling completed for ${this.componentName}:`, {
        duration: `${profiling.totalDuration?.toFixed(2)}ms`,
        renders: profiling.renderCount,
        changeDetections: this.changeDetectionCount,
        domChanges: this.domChangeCount
      });
    }

    // Clean up observers
    this.cleanupObservers();
  }

  // =============================================================================
  // PERFORMANCE MEASUREMENT
  // =============================================================================

  /**
   * Measures render performance for the current change detection cycle
   */
  private measureRenderPerformance(): void {
    // Mark render start
    this.performanceService.markRenderStart(this.componentName);

    // Use NgZone to track when rendering is complete
    this.ngZone.runOutsideAngular(() => {
      // Use requestAnimationFrame to detect when DOM updates are complete
      requestAnimationFrame(() => {
        this.performanceService.markRenderEnd(this.componentName);
      });
    });
  }

  /**
   * Determines if performance should be sampled this cycle
   * 
   * @returns True if should sample
   */
  private shouldSamplePerformance(): boolean {
    const sampleRate = this.profilingOptions.sampleRate ?? 1.0;
    return Math.random() <= sampleRate;
  }

  // =============================================================================
  // DOM MONITORING
  // =============================================================================

  /**
   * Sets up DOM mutation monitoring
   */
  private setupDOMMonitoring(): void {
    if (!this.profilingOptions.trackDOMChanges) return;

    if ('MutationObserver' in window) {
      this.mutationObserver = new MutationObserver((mutations) => {
        this.domChangeCount += mutations.length;
        
        // Log significant DOM changes
        if (mutations.length > 10) {
          console.log(`🔄 Large DOM change detected in ${this.componentName}: ${mutations.length} mutations`);
        }
      });

      this.mutationObserver.observe(this.elementRef.nativeElement, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeOldValue: true,
        characterData: true,
        characterDataOldValue: true
      });
    }

    // Set up resize monitoring
    if ('ResizeObserver' in window) {
      this.resizeObserver = new ResizeObserver((entries) => {
        entries.forEach(entry => {
          const { width, height } = entry.contentRect;
          console.log(`📏 Component ${this.componentName} resized: ${width}x${height}`);
        });
      });

      this.resizeObserver.observe(this.elementRef.nativeElement);
    }
  }

  /**
   * Sets up visibility monitoring
   */
  private setupVisibilityMonitoring(): void {
    if (!this.profilingOptions.trackVisibility) return;

    if ('IntersectionObserver' in window) {
      this.intersectionObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          const isVisible = entry.isIntersecting;
          const visibilityRatio = entry.intersectionRatio;

          if (isVisible) {
            console.log(`👁️ Component ${this.componentName} became visible (${(visibilityRatio * 100).toFixed(1)}% visible)`);
            this.onComponentVisible();
          } else {
            console.log(`👁️ Component ${this.componentName} became hidden`);
            this.onComponentHidden();
          }
        });
      }, {
        threshold: [0, 0.25, 0.5, 0.75, 1.0]
      });

      this.intersectionObserver.observe(this.elementRef.nativeElement);
    }
  }

  /**
   * Handles component becoming visible
   */
  private onComponentVisible(): void {
    // Start more frequent profiling when component is visible
    if (this.profilingOptions.trackVisibility) {
      console.log(`🎯 Component ${this.componentName} is now visible - increasing profiling frequency`);
    }
  }

  /**
   * Handles component becoming hidden
   */
  private onComponentHidden(): void {
    // Reduce profiling frequency when component is hidden
    if (this.profilingOptions.trackVisibility) {
      console.log(`🎯 Component ${this.componentName} is now hidden - reducing profiling frequency`);
    }
  }

  // =============================================================================
  // ADVANCED PERFORMANCE TRACKING
  // =============================================================================

  /**
   * Tracks specific component events
   * 
   * @param eventType - Type of event to track
   * @param data - Additional event data
   */
  trackEvent(eventType: string, data?: any): void {
    const timestamp = performance.now();
    
    console.log(`📊 Performance event in ${this.componentName}:`, {
      type: eventType,
      timestamp,
      data
    });

    // Mark performance event
    performance.mark(`${this.componentName}-${eventType}-${timestamp}`);
  }

  /**
   * Measures time for a specific operation
   * 
   * @param operationName - Name of the operation
   * @param operation - Function to measure
   * @returns Result of the operation
   */
  measureOperation<T>(operationName: string, operation: () => T): T {
    const startMark = `${this.componentName}-${operationName}-start`;
    const endMark = `${this.componentName}-${operationName}-end`;
    const measureName = `${this.componentName}-${operationName}-duration`;

    performance.mark(startMark);
    const result = operation();
    performance.mark(endMark);
    performance.measure(measureName, startMark, endMark);

    // Log the measurement
    const measure = performance.getEntriesByName(measureName)[0];
    if (measure) {
      console.log(`⏱️ ${operationName} in ${this.componentName}: ${measure.duration.toFixed(2)}ms`);
    }

    return result;
  }

  /**
   * Gets performance summary for this component
   * 
   * @returns Performance summary
   */
  getPerformanceSummary(): ComponentPerformanceSummary {
    return {
      componentName: this.componentName,
      changeDetectionCount: this.changeDetectionCount,
      domChangeCount: this.domChangeCount,
      isVisible: this.isComponentCurrentlyVisible(),
      profilingDuration: this.performanceStartTime ? performance.now() - this.performanceStartTime : 0
    };
  }

  /**
   * Checks if component is currently visible
   * 
   * @returns True if component is visible
   */
  private isComponentCurrentlyVisible(): boolean {
    const element = this.elementRef.nativeElement;
    const rect = element.getBoundingClientRect();
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth;

    return (
      rect.top < viewportHeight &&
      rect.bottom > 0 &&
      rect.left < viewportWidth &&
      rect.right > 0
    );
  }

  // =============================================================================
  // CLEANUP
  // =============================================================================

  /**
   * Cleans up all observers and resources
   */
  private cleanupObservers(): void {
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = undefined;
    }

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = undefined;
    }

    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
      this.intersectionObserver = undefined;
    }
  }
}

// =============================================================================
// INTERFACES
// =============================================================================

export interface ProfilingDirectiveOptions {
  trackMemory?: boolean;
  trackChangeDetection?: boolean;
  trackDOMChanges?: boolean;
  trackVisibility?: boolean;
  sampleRate?: number;
}

export interface ComponentPerformanceSummary {
  componentName: string;
  changeDetectionCount: number;
  domChangeCount: number;
  isVisible: boolean;
  profilingDuration: number;
}

// =============================================================================
// PERFORMANCE PROFILING HELPERS
// =============================================================================

/**
 * Decorator for automatic method performance tracking
 * 
 * @param target - Target class
 * @param propertyName - Method name
 * @param descriptor - Method descriptor
 */
export function TrackPerformance(target: any, propertyName: string, descriptor: PropertyDescriptor): PropertyDescriptor {
  const method = descriptor.value;

  descriptor.value = function (...args: any[]) {
    const startTime = performance.now();
    const className = target.constructor.name;
    
    try {
      const result = method.apply(this, args);
      
      // Handle async methods
      if (result && typeof result.then === 'function') {
        return result.finally(() => {
          const duration = performance.now() - startTime;
          console.log(`⏱️ ${className}.${propertyName}() completed in ${duration.toFixed(2)}ms`);
        });
      } else {
        const duration = performance.now() - startTime;
        console.log(`⏱️ ${className}.${propertyName}() completed in ${duration.toFixed(2)}ms`);
        return result;
      }
    } catch (error) {
      const duration = performance.now() - startTime;
      console.error(`❌ ${className}.${propertyName}() failed after ${duration.toFixed(2)}ms:`, error);
      throw error;
    }
  };

  return descriptor;
}

/**
 * Decorator for tracking component lifecycle performance
 * 
 * @param componentName - Name of the component for tracking
 */
export function ProfileComponent(componentName?: string) {
  return function <T extends { new(...args: any[]): {} }>(constructor: T) {
    return class extends constructor {
      private __performanceProfiler = {
        componentName: componentName || constructor.name,
        startTime: performance.now()
      };

      constructor(...args: any[]) {
        super(...args);
        console.log(`🎯 Component ${this.__performanceProfiler.componentName} constructor completed in ${(performance.now() - this.__performanceProfiler.startTime).toFixed(2)}ms`);
      }
    };
  };
}