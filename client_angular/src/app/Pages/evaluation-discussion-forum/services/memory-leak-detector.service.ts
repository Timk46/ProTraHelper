import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, interval, Subscription } from 'rxjs';
import { filter, map } from 'rxjs/operators';

/**
 * Memory leak detection service for Angular components
 * 
 * @description This service monitors Angular components and services
 * for potential memory leaks, unclosed subscriptions, and excessive
 * memory usage patterns. It provides early warning systems and
 * automatic cleanup suggestions.
 * 
 * Features:
 * - Subscription leak detection
 * - Memory usage monitoring
 * - Component lifecycle tracking
 * - Observer pattern violations
 * - DOM node leak detection
 * - Automatic cleanup recommendations
 * 
 * @example
 * ```typescript
 * constructor(private memoryDetector: MemoryLeakDetectorService) {
 *   // Register component for monitoring
 *   this.memoryDetector.registerComponent('my-component', this);
 * 
 *   // Track subscriptions automatically
 *   const subscription = this.dataService.getData()
 *     .pipe(this.memoryDetector.trackSubscription('my-component', 'data-stream'))
 *     .subscribe(data => console.log(data));
 * }
 * ```
 */
@Injectable({
  providedIn: 'root'
})
export class MemoryLeakDetectorService {

  private leakDetectionSubject = new BehaviorSubject<LeakDetectionReport>({
    detectedLeaks: [],
    monitoredComponents: new Map(),
    subscriptionRegistry: new Map(),
    memoryBaseline: 0,
    currentMemoryUsage: 0,
    leakRisk: 'low',
    recommendations: [],
    timestamp: Date.now()
  });

  private componentRegistry = new Map<string, ComponentMonitor>();
  private subscriptionRegistry = new Map<string, SubscriptionTracker[]>();
  private memoryMonitoringInterval?: number;
  private domObserver?: MutationObserver;
  private weakMap = new WeakMap(); // For garbage collection tracking
  private isMonitoringActive = false;

  constructor() {
    this.initializeMemoryMonitoring();
    this.setupDOMLeakDetection();
  }

  // =============================================================================
  // PUBLIC OBSERVABLES
  // =============================================================================

  /**
   * Observable for leak detection reports
   */
  get leakDetectionReport$(): Observable<LeakDetectionReport> {
    return this.leakDetectionSubject.asObservable();
  }

  /**
   * Observable for high-risk memory leaks only
   */
  get criticalLeaks$(): Observable<MemoryLeak[]> {
    return this.leakDetectionReport$.pipe(
      map(report => report.detectedLeaks.filter(leak => leak.severity === 'critical'))
    );
  }

  /**
   * Observable for memory usage trends
   */
  get memoryTrends$(): Observable<MemoryTrend> {
    return this.leakDetectionReport$.pipe(
      map(report => ({
        baseline: report.memoryBaseline,
        current: report.currentMemoryUsage,
        trend: report.currentMemoryUsage > report.memoryBaseline ? 'increasing' : 'stable',
        growthRate: this.calculateMemoryGrowthRate()
      }))
    );
  }

  // =============================================================================
  // COMPONENT REGISTRATION
  // =============================================================================

  /**
   * Registers a component for memory leak monitoring
   * 
   * @param componentName - Name of the component
   * @param componentInstance - Instance of the component
   * @param options - Monitoring options
   */
  registerComponent(
    componentName: string, 
    componentInstance: any, 
    options: ComponentMonitorOptions = {}
  ): void {
    const monitor: ComponentMonitor = {
      name: componentName,
      instance: componentInstance,
      registrationTime: Date.now(),
      destructionTime: null,
      subscriptions: [],
      memorySnapshot: this.getCurrentMemoryUsage(),
      domNodes: 0,
      isDestroyed: false,
      options: {
        trackSubscriptions: true,
        trackDOM: true,
        trackMemory: true,
        warningThreshold: 50 * 1024 * 1024, // 50MB
        ...options
      }
    };

    this.componentRegistry.set(componentName, monitor);
    this.subscriptionRegistry.set(componentName, []);
    
    // Track component in WeakMap for GC detection
    this.weakMap.set(componentInstance, { componentName, registrationTime: Date.now() });

    console.log(`🔍 Registered component for leak detection: ${componentName}`);
    this.updateLeakDetectionReport();
  }

  /**
   * Unregisters a component from monitoring
   * 
   * @param componentName - Name of the component to unregister
   */
  unregisterComponent(componentName: string): void {
    const monitor = this.componentRegistry.get(componentName);
    if (monitor) {
      monitor.destructionTime = Date.now();
      monitor.isDestroyed = true;
      
      // Check for subscription leaks
      this.checkSubscriptionLeaks(componentName);
      
      // Check for memory leaks
      this.checkComponentMemoryLeak(componentName);
      
      console.log(`✅ Unregistered component: ${componentName}`);
    }

    // Clean up after a delay to allow for leak detection
    setTimeout(() => {
      this.componentRegistry.delete(componentName);
      this.subscriptionRegistry.delete(componentName);
    }, 5000);
  }

  // =============================================================================
  // SUBSCRIPTION TRACKING
  // =============================================================================

  /**
   * Tracks a subscription for automatic leak detection
   * 
   * @param componentName - Component that owns the subscription
   * @param subscriptionName - Name/identifier for the subscription
   * @returns RxJS operator for pipe chaining
   */
  trackSubscription<T>(componentName: string, subscriptionName: string) {
    return (source: Observable<T>) => {
      const tracker: SubscriptionTracker = {
        name: subscriptionName,
        componentName,
        creationTime: Date.now(),
        isActive: true,
        subscription: null,
        unsubscribeCallCount: 0
      };

      // Add to registry
      const componentTrackers = this.subscriptionRegistry.get(componentName) || [];
      componentTrackers.push(tracker);
      this.subscriptionRegistry.set(componentName, componentTrackers);

      return new Observable<T>(subscriber => {
        const subscription = source.subscribe({
          next: value => subscriber.next(value),
          error: error => subscriber.error(error),
          complete: () => subscriber.complete()
        });

        // Store subscription reference
        tracker.subscription = subscription;

        // Override unsubscribe to track calls
        const originalUnsubscribe = subscription.unsubscribe.bind(subscription);
        subscription.unsubscribe = () => {
          tracker.unsubscribeCallCount++;
          tracker.isActive = false;
          tracker.destructionTime = Date.now();
          originalUnsubscribe();
          
          console.log(`🔗 Subscription unsubscribed: ${componentName}.${subscriptionName}`);
        };

        return subscription;
      });
    };
  }

  /**
   * Manually registers a subscription for tracking
   * 
   * @param componentName - Component name
   * @param subscription - Subscription to track
   * @param subscriptionName - Name for the subscription
   */
  registerSubscription(
    componentName: string, 
    subscription: Subscription, 
    subscriptionName: string
  ): void {
    const tracker: SubscriptionTracker = {
      name: subscriptionName,
      componentName,
      creationTime: Date.now(),
      isActive: true,
      subscription,
      unsubscribeCallCount: 0
    };

    const componentTrackers = this.subscriptionRegistry.get(componentName) || [];
    componentTrackers.push(tracker);
    this.subscriptionRegistry.set(componentName, componentTrackers);

    console.log(`📊 Registered subscription: ${componentName}.${subscriptionName}`);
  }

  // =============================================================================
  // LEAK DETECTION ALGORITHMS
  // =============================================================================

  /**
   * Checks for subscription leaks in a component
   * 
   * @param componentName - Component to check
   */
  private checkSubscriptionLeaks(componentName: string): void {
    const trackers = this.subscriptionRegistry.get(componentName) || [];
    const activeSubscriptions = trackers.filter(t => t.isActive);

    if (activeSubscriptions.length > 0) {
      const leak: MemoryLeak = {
        type: 'subscription',
        componentName,
        severity: activeSubscriptions.length > 3 ? 'critical' : 'warning',
        description: `${activeSubscriptions.length} active subscriptions detected after component destruction`,
        details: {
          activeSubscriptions: activeSubscriptions.map(t => t.name),
          subscriptionCount: activeSubscriptions.length,
          suggestions: [
            'Use takeUntil operator with destroy$ subject',
            'Call unsubscribe() in ngOnDestroy',
            'Use async pipe in templates instead of manual subscriptions'
          ]
        },
        detectedAt: Date.now(),
        memoryImpact: activeSubscriptions.length * 1024 // Rough estimate
      };

      this.reportMemoryLeak(leak);
      console.warn(`🚨 Subscription leak detected in ${componentName}:`, activeSubscriptions);
    }
  }

  /**
   * Checks for memory leaks in a component
   * 
   * @param componentName - Component to check
   */
  private checkComponentMemoryLeak(componentName: string): void {
    const monitor = this.componentRegistry.get(componentName);
    if (!monitor || !monitor.options.trackMemory) return;

    const currentMemory = this.getCurrentMemoryUsage();
    const memoryDelta = currentMemory - monitor.memorySnapshot;
    const thresholdExceeded = memoryDelta > (monitor.options.warningThreshold || 10 * 1024 * 1024);

    if (thresholdExceeded) {
      const leak: MemoryLeak = {
        type: 'memory',
        componentName,
        severity: memoryDelta > 100 * 1024 * 1024 ? 'critical' : 'warning', // 100MB critical
        description: `Excessive memory usage: +${this.formatBytes(memoryDelta)}`,
        details: {
          memoryBefore: monitor.memorySnapshot,
          memoryAfter: currentMemory,
          memoryDelta,
          suggestions: [
            'Check for circular references',
            'Review large object caching',
            'Implement proper cleanup in ngOnDestroy',
            'Use WeakMap for object references'
          ]
        },
        detectedAt: Date.now(),
        memoryImpact: memoryDelta
      };

      this.reportMemoryLeak(leak);
      console.warn(`🚨 Memory leak detected in ${componentName}: +${this.formatBytes(memoryDelta)}`);
    }
  }

  /**
   * Detects DOM node leaks
   */
  private detectDOMLeaks(): void {
    const nodeCount = document.querySelectorAll('*').length;
    const previousNodeCount = this.getPreviousNodeCount();
    
    if (previousNodeCount && nodeCount > previousNodeCount + 1000) { // 1000 node threshold
      const leak: MemoryLeak = {
        type: 'dom',
        componentName: 'global',
        severity: 'warning',
        description: `Excessive DOM nodes: ${nodeCount} (increase of ${nodeCount - previousNodeCount})`,
        details: {
          currentNodes: nodeCount,
          previousNodes: previousNodeCount,
          nodeIncrease: nodeCount - previousNodeCount,
          suggestions: [
            'Check for components not properly removing DOM elements',
            'Verify virtual scrolling implementation',
            'Review dynamic component creation/destruction'
          ]
        },
        detectedAt: Date.now(),
        memoryImpact: (nodeCount - previousNodeCount) * 100 // Rough estimate
      };

      this.reportMemoryLeak(leak);
    }

    this.setPreviousNodeCount(nodeCount);
  }

  /**
   * Detects event listener leaks
   */
  private detectEventListenerLeaks(): MemoryLeak[] {
    const leaks: MemoryLeak[] = [];
    
    // This is a simplified detection - in a real implementation,
    // you'd need to track event listeners more comprehensively
    if (typeof (window as any).getEventListeners === 'function') {
      const listeners = (window as any).getEventListeners(window);
      const listenerCount = Object.keys(listeners).reduce((sum, key) => sum + listeners[key].length, 0);
      
      if (listenerCount > 50) { // Arbitrary threshold
        leaks.push({
          type: 'event_listener',
          componentName: 'global',
          severity: 'warning',
          description: `High number of event listeners: ${listenerCount}`,
          details: {
            listenerCount,
            listenerTypes: Object.keys(listeners),
            suggestions: [
              'Remove event listeners in component ngOnDestroy',
              'Use @HostListener decorator instead of manual addEventListener',
              'Check for duplicate listener registrations'
            ]
          },
          detectedAt: Date.now(),
          memoryImpact: listenerCount * 512 // Rough estimate
        });
      }
    }

    return leaks;
  }

  // =============================================================================
  // MEMORY MONITORING
  // =============================================================================

  /**
   * Gets current memory usage from Performance API
   * 
   * @returns Current memory usage in bytes
   */
  private getCurrentMemoryUsage(): number {
    if ('memory' in performance && (performance as any).memory) {
      return (performance as any).memory.usedJSHeapSize;
    }
    return 0;
  }

  /**
   * Calculates memory growth rate
   * 
   * @returns Growth rate as percentage
   */
  private calculateMemoryGrowthRate(): number {
    const currentReport = this.leakDetectionSubject.value;
    if (currentReport.memoryBaseline === 0) return 0;
    
    return ((currentReport.currentMemoryUsage - currentReport.memoryBaseline) / currentReport.memoryBaseline) * 100;
  }

  /**
   * Determines leak risk level
   * 
   * @param leaks - Detected leaks
   * @returns Risk level
   */
  private determineLeakRisk(leaks: MemoryLeak[]): LeakRisk {
    const criticalLeaks = leaks.filter(l => l.severity === 'critical').length;
    const warningLeaks = leaks.filter(l => l.severity === 'warning').length;

    if (criticalLeaks > 0) return 'critical';
    if (warningLeaks > 2) return 'high';
    if (warningLeaks > 0) return 'medium';
    return 'low';
  }

  // =============================================================================
  // INITIALIZATION
  // =============================================================================

  /**
   * Initializes memory monitoring
   */
  private initializeMemoryMonitoring(): void {
    if (!this.isMonitoringActive) {
      this.isMonitoringActive = true;
      
      // Set memory baseline
      const currentReport = this.leakDetectionSubject.value;
      this.leakDetectionSubject.next({
        ...currentReport,
        memoryBaseline: this.getCurrentMemoryUsage()
      });

      // Start periodic monitoring
      this.memoryMonitoringInterval = window.setInterval(() => {
        this.performLeakDetectionScan();
      }, 10000); // Check every 10 seconds

      console.log('🔍 Memory leak monitoring initialized');
    }
  }

  /**
   * Sets up DOM leak detection
   */
  private setupDOMLeakDetection(): void {
    if ('MutationObserver' in window) {
      this.domObserver = new MutationObserver(() => {
        // Throttle DOM leak detection
        setTimeout(() => this.detectDOMLeaks(), 1000);
      });

      this.domObserver.observe(document.body, {
        childList: true,
        subtree: true
      });
    }
  }

  /**
   * Performs comprehensive leak detection scan
   */
  private performLeakDetectionScan(): void {
    const detectedLeaks: MemoryLeak[] = [];
    
    // Check all registered components
    this.componentRegistry.forEach((monitor, componentName) => {
      if (!monitor.isDestroyed) {
        // Check for long-running components with memory growth
        const currentMemory = this.getCurrentMemoryUsage();
        const memoryDelta = currentMemory - monitor.memorySnapshot;
        const componentAge = Date.now() - monitor.registrationTime;
        
        // Flag components that have been alive for >5 minutes with >20MB growth
        if (componentAge > 5 * 60 * 1000 && memoryDelta > 20 * 1024 * 1024) {
          const leak: MemoryLeak = {
            type: 'memory',
            componentName,
            severity: 'warning',
            description: `Long-running component with memory growth: +${this.formatBytes(memoryDelta)}`,
            details: {
              componentAge: componentAge / 1000 / 60, // minutes
              memoryGrowth: memoryDelta,
              suggestions: [
                'Check for memory accumulation in component',
                'Review caching strategies',
                'Implement periodic cleanup'
              ]
            },
            detectedAt: Date.now(),
            memoryImpact: memoryDelta
          };
          
          detectedLeaks.push(leak);
        }
      }
    });

    // Detect event listener leaks
    detectedLeaks.push(...this.detectEventListenerLeaks());

    // Update report
    if (detectedLeaks.length > 0) {
      detectedLeaks.forEach(leak => this.reportMemoryLeak(leak));
    }
  }

  // =============================================================================
  // REPORTING
  // =============================================================================

  /**
   * Reports a memory leak
   * 
   * @param leak - Memory leak to report
   */
  private reportMemoryLeak(leak: MemoryLeak): void {
    const currentReport = this.leakDetectionSubject.value;
    const updatedLeaks = [...currentReport.detectedLeaks, leak];
    
    this.updateLeakDetectionReport(updatedLeaks);
    
    // Log based on severity
    if (leak.severity === 'critical') {
      console.error('🚨 CRITICAL MEMORY LEAK:', leak);
    } else {
      console.warn('⚠️ Memory leak detected:', leak);
    }
  }

  /**
   * Updates the leak detection report
   * 
   * @param leaks - Optional leaks array
   */
  private updateLeakDetectionReport(leaks?: MemoryLeak[]): void {
    const currentReport = this.leakDetectionSubject.value;
    const detectedLeaks = leaks || currentReport.detectedLeaks;
    
    this.leakDetectionSubject.next({
      detectedLeaks,
      monitoredComponents: this.componentRegistry,
      subscriptionRegistry: this.subscriptionRegistry,
      memoryBaseline: currentReport.memoryBaseline,
      currentMemoryUsage: this.getCurrentMemoryUsage(),
      leakRisk: this.determineLeakRisk(detectedLeaks),
      recommendations: this.generateRecommendations(detectedLeaks),
      timestamp: Date.now()
    });
  }

  /**
   * Generates recommendations based on detected leaks
   * 
   * @param leaks - Detected leaks
   * @returns Array of recommendations
   */
  private generateRecommendations(leaks: MemoryLeak[]): string[] {
    const recommendations = new Set<string>();

    leaks.forEach(leak => {
      if (leak.details.suggestions) {
        leak.details.suggestions.forEach(suggestion => recommendations.add(suggestion));
      }
    });

    // Add general recommendations
    if (leaks.some(l => l.type === 'subscription')) {
      recommendations.add('Implement consistent subscription cleanup patterns');
    }
    
    if (leaks.some(l => l.type === 'memory')) {
      recommendations.add('Review component memory management practices');
    }

    return Array.from(recommendations);
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  /**
   * Formats bytes to human-readable string
   * 
   * @param bytes - Bytes to format
   * @returns Formatted string
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Gets previous node count from storage
   * 
   * @returns Previous node count
   */
  private getPreviousNodeCount(): number {
    return parseInt(sessionStorage.getItem('hefl-previous-node-count') || '0', 10);
  }

  /**
   * Sets previous node count in storage
   * 
   * @param count - Node count to store
   */
  private setPreviousNodeCount(count: number): void {
    sessionStorage.setItem('hefl-previous-node-count', count.toString());
  }

  // =============================================================================
  // PUBLIC API
  // =============================================================================

  /**
   * Gets current leak detection summary
   * 
   * @returns Leak detection summary
   */
  getLeakSummary(): LeakSummary {
    const report = this.leakDetectionSubject.value;
    
    return {
      totalLeaks: report.detectedLeaks.length,
      criticalLeaks: report.detectedLeaks.filter(l => l.severity === 'critical').length,
      warningLeaks: report.detectedLeaks.filter(l => l.severity === 'warning').length,
      monitoredComponents: report.monitoredComponents.size,
      memoryUsage: this.formatBytes(report.currentMemoryUsage),
      leakRisk: report.leakRisk,
      recommendations: report.recommendations.slice(0, 3) // Top 3 recommendations
    };
  }

  /**
   * Forces a leak detection scan
   */
  forceScan(): void {
    console.log('🔍 Forcing leak detection scan...');
    this.performLeakDetectionScan();
  }

  /**
   * Clears all detected leaks (for testing/development)
   */
  clearLeaks(): void {
    this.updateLeakDetectionReport([]);
    console.log('🧹 Cleared all detected leaks');
  }

  // =============================================================================
  // CLEANUP
  // =============================================================================

  /**
   * Destroys the memory leak detector
   */
  destroy(): void {
    this.isMonitoringActive = false;
    
    if (this.memoryMonitoringInterval) {
      clearInterval(this.memoryMonitoringInterval);
    }
    
    if (this.domObserver) {
      this.domObserver.disconnect();
    }
    
    this.componentRegistry.clear();
    this.subscriptionRegistry.clear();
    this.leakDetectionSubject.complete();
    
    console.log('🛑 Memory leak detector destroyed');
  }
}

// =============================================================================
// INTERFACES
// =============================================================================

export interface LeakDetectionReport {
  detectedLeaks: MemoryLeak[];
  monitoredComponents: Map<string, ComponentMonitor>;
  subscriptionRegistry: Map<string, SubscriptionTracker[]>;
  memoryBaseline: number;
  currentMemoryUsage: number;
  leakRisk: LeakRisk;
  recommendations: string[];
  timestamp: number;
}

export interface MemoryLeak {
  type: 'subscription' | 'memory' | 'dom' | 'event_listener';
  componentName: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  description: string;
  details: {
    [key: string]: any;
    suggestions?: string[];
  };
  detectedAt: number;
  memoryImpact: number;
}

export interface ComponentMonitor {
  name: string;
  instance: any;
  registrationTime: number;
  destructionTime: number | null;
  subscriptions: string[];
  memorySnapshot: number;
  domNodes: number;
  isDestroyed: boolean;
  options: ComponentMonitorOptions;
}

export interface ComponentMonitorOptions {
  trackSubscriptions?: boolean;
  trackDOM?: boolean;
  trackMemory?: boolean;
  warningThreshold?: number;
}

export interface SubscriptionTracker {
  name: string;
  componentName: string;
  creationTime: number;
  destructionTime?: number;
  isActive: boolean;
  subscription: Subscription | null;
  unsubscribeCallCount: number;
}

export interface MemoryTrend {
  baseline: number;
  current: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  growthRate: number;
}

export interface LeakSummary {
  totalLeaks: number;
  criticalLeaks: number;
  warningLeaks: number;
  monitoredComponents: number;
  memoryUsage: string;
  leakRisk: LeakRisk;
  recommendations: string[];
}

export type LeakRisk = 'low' | 'medium' | 'high' | 'critical';