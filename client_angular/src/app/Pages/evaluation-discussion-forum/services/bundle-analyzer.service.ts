import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Bundle analyzer service for performance optimization
 * 
 * @description This service analyzes the application's bundle structure,
 * identifies optimization opportunities, and provides insights for
 * code splitting and lazy loading improvements.
 * 
 * Features:
 * - Bundle size analysis
 * - Chunk loading performance
 * - Lazy loading optimization
 * - Code splitting recommendations
 * - Tree shaking effectiveness
 * - Module dependency analysis
 * 
 * @example
 * ```typescript
 * constructor(private bundleAnalyzer: BundleAnalyzerService) {
 *   this.bundleAnalyzer.analyzeBundleStructure();
 *   this.bundleAnalyzer.bundleMetrics$.subscribe(metrics => {
 *     console.log('Bundle metrics:', metrics);
 *   });
 * }
 * ```
 */
@Injectable({
  providedIn: 'root'
})
export class BundleAnalyzerService {

  private bundleMetricsSubject = new BehaviorSubject<BundleAnalysisMetrics>({
    totalBundleSize: 0,
    mainChunkSize: 0,
    lazyChunksSize: 0,
    vendorChunkSize: 0,
    chunkCount: 0,
    lazyChunkCount: 0,
    compressionRatio: 0,
    loadingPerformance: {
      mainChunkLoadTime: 0,
      averageLazyChunkLoadTime: 0,
      totalLoadTime: 0,
      parallelLoadingEfficiency: 0
    },
    optimization: {
      treeShakingEffectiveness: 0,
      codeSplittingScore: 0,
      chunkUtilization: 0,
      duplicateCodeDetected: 0
    },
    recommendations: [],
    detectedModules: [],
    timestamp: Date.now()
  });

  private chunkLoadTimes = new Map<string, number>();
  private resourceLoadObserver?: PerformanceObserver;

  constructor() {
    this.initializeBundleMonitoring();
    this.setupResourceLoadTracking();
  }

  // =============================================================================
  // PUBLIC OBSERVABLES
  // =============================================================================

  /**
   * Observable for bundle metrics
   */
  get bundleMetrics$(): Observable<BundleAnalysisMetrics> {
    return this.bundleMetricsSubject.asObservable();
  }

  /**
   * Observable for optimization recommendations
   */
  get optimizationRecommendations$(): Observable<OptimizationRecommendation[]> {
    return this.bundleMetrics$.pipe(
      map(metrics => metrics.recommendations)
    );
  }

  /**
   * Observable for loading performance metrics
   */
  get loadingPerformance$(): Observable<LoadingPerformance> {
    return this.bundleMetrics$.pipe(
      map(metrics => metrics.loadingPerformance)
    );
  }

  // =============================================================================
  // BUNDLE ANALYSIS
  // =============================================================================

  /**
   * Analyzes the current bundle structure
   */
  analyzeBundleStructure(): void {
    // Analyze loaded resources
    this.analyzeLoadedResources();
    
    // Detect module structure
    this.detectModuleStructure();
    
    // Analyze chunk loading performance
    this.analyzeChunkLoadingPerformance();
    
    // Generate optimization recommendations
    this.generateOptimizationRecommendations();
    
  }

  /**
   * Analyzes loaded JavaScript resources
   */
  private analyzeLoadedResources(): void {
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    const jsResources = resources.filter(r => 
      r.name.endsWith('.js') && !r.name.includes('node_modules')
    );

    let totalSize = 0;
    let mainChunkSize = 0;
    let lazyChunksSize = 0;
    let vendorChunkSize = 0;
    let chunkCount = 0;
    let lazyChunkCount = 0;

    jsResources.forEach(resource => {
      const size = resource.transferSize || 0;
      totalSize += size;
      chunkCount++;

      // Categorize chunks
      if (resource.name.includes('main')) {
        mainChunkSize += size;
      } else if (resource.name.includes('vendor') || resource.name.includes('polyfills')) {
        vendorChunkSize += size;
      } else if (this.isLazyLoadedChunk(resource.name)) {
        lazyChunksSize += size;
        lazyChunkCount++;
      }
    });

    // Calculate compression ratio
    const uncompressedSize = jsResources.reduce((sum, r) => sum + (r.decodedBodySize || 0), 0);
    const compressedSize = jsResources.reduce((sum, r) => sum + (r.transferSize || 0), 0);
    const compressionRatio = compressedSize > 0 ? (1 - compressedSize / uncompressedSize) : 0;

    // Update metrics
    const currentMetrics = this.bundleMetricsSubject.value;
    this.bundleMetricsSubject.next({
      ...currentMetrics,
      totalBundleSize: totalSize,
      mainChunkSize,
      lazyChunksSize,
      vendorChunkSize,
      chunkCount,
      lazyChunkCount,
      compressionRatio,
      timestamp: Date.now()
    });

  }

  /**
   * Detects the module structure of the application
   */
  private detectModuleStructure(): void {
    const detectedModules: DetectedModule[] = [];

    // Analyze loaded modules from performance entries
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    const moduleResources = resources.filter(r => 
      r.name.includes('.js') && !r.name.includes('node_modules')
    );

    moduleResources.forEach(resource => {
      const module = this.analyzeModuleFromResource(resource);
      if (module) {
        detectedModules.push(module);
      }
    });

    // Analyze module dependencies (simplified)
    this.analyzeModuleDependencies(detectedModules);

    // Update metrics
    const currentMetrics = this.bundleMetricsSubject.value;
    this.bundleMetricsSubject.next({
      ...currentMetrics,
      detectedModules,
      timestamp: Date.now()
    });
  }

  /**
   * Analyzes module from resource entry
   * 
   * @param resource - Performance resource entry
   * @returns Detected module or null
   */
  private analyzeModuleFromResource(resource: PerformanceResourceTiming): DetectedModule | null {
    const fileName = resource.name.split('/').pop() || '';
    const size = resource.transferSize || 0;
    const loadTime = resource.responseEnd - resource.requestStart;

    // Determine module type
    let moduleType: ModuleType = 'unknown';
    if (fileName.includes('main')) moduleType = 'main';
    else if (fileName.includes('vendor')) moduleType = 'vendor';
    else if (fileName.includes('polyfills')) moduleType = 'polyfills';
    else if (this.isLazyLoadedChunk(fileName)) moduleType = 'lazy';

    // Determine if it's evaluation-related
    const isEvaluationModule = this.isEvaluationRelatedModule(fileName);

    return {
      name: fileName,
      type: moduleType,
      size,
      loadTime,
      isLazyLoaded: moduleType === 'lazy',
      isEvaluationRelated: isEvaluationModule,
      dependencies: [],
      utilization: this.estimateModuleUtilization(fileName),
      lastAccessed: Date.now()
    };
  }

  /**
   * Analyzes chunk loading performance
   */
  private analyzeChunkLoadingPerformance(): void {
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    const jsResources = resources.filter(r => r.name.endsWith('.js'));

    let mainChunkLoadTime = 0;
    const lazyChunkLoadTimes: number[] = [];
    let totalLoadTime = 0;

    jsResources.forEach(resource => {
      const loadTime = resource.responseEnd - resource.requestStart;
      totalLoadTime += loadTime;

      if (resource.name.includes('main')) {
        mainChunkLoadTime = loadTime;
      } else if (this.isLazyLoadedChunk(resource.name)) {
        lazyChunkLoadTimes.push(loadTime);
      }
    });

    const averageLazyChunkLoadTime = lazyChunkLoadTimes.length > 0 
      ? lazyChunkLoadTimes.reduce((sum, time) => sum + time, 0) / lazyChunkLoadTimes.length 
      : 0;

    // Calculate parallel loading efficiency
    const parallelLoadingEfficiency = this.calculateParallelLoadingEfficiency(jsResources);

    const loadingPerformance: LoadingPerformance = {
      mainChunkLoadTime,
      averageLazyChunkLoadTime,
      totalLoadTime,
      parallelLoadingEfficiency
    };

    // Update metrics
    const currentMetrics = this.bundleMetricsSubject.value;
    this.bundleMetricsSubject.next({
      ...currentMetrics,
      loadingPerformance,
      timestamp: Date.now()
    });
  }

  // =============================================================================
  // OPTIMIZATION ANALYSIS
  // =============================================================================

  /**
   * Generates optimization recommendations
   */
  private generateOptimizationRecommendations(): void {
    const metrics = this.bundleMetricsSubject.value;
    const recommendations: OptimizationRecommendation[] = [];

    // Check bundle size recommendations
    if (metrics.mainChunkSize > 500 * 1024) { // 500KB
      recommendations.push({
        type: 'bundle_size',
        priority: 'high',
        title: 'Large main bundle detected',
        description: `Main bundle is ${(metrics.mainChunkSize / 1024).toFixed(2)}KB. Consider code splitting.`,
        impact: 'high',
        effort: 'medium',
        actions: [
          'Implement lazy loading for feature modules',
          'Split large components into separate chunks',
          'Review and remove unused dependencies'
        ]
      });
    }

    // Check lazy loading opportunities
    if (metrics.lazyChunkCount === 0) {
      recommendations.push({
        type: 'lazy_loading',
        priority: 'medium',
        title: 'No lazy loading detected',
        description: 'Application could benefit from lazy loading implementation.',
        impact: 'medium',
        effort: 'medium',
        actions: [
          'Implement lazy loading for evaluation forum module',
          'Split large components into loadable modules',
          'Use dynamic imports for conditional features'
        ]
      });
    }

    // Check compression optimization
    if (metrics.compressionRatio < 0.7) {
      recommendations.push({
        type: 'compression',
        priority: 'medium',
        title: 'Improve compression',
        description: `Current compression ratio is ${(metrics.compressionRatio * 100).toFixed(1)}%. Better compression possible.`,
        impact: 'medium',
        effort: 'low',
        actions: [
          'Enable Brotli compression on server',
          'Optimize build configuration for better minification',
          'Remove unnecessary whitespace and comments'
        ]
      });
    }

    // Check chunk utilization
    const avgUtilization = metrics.detectedModules.reduce((sum, m) => sum + m.utilization, 0) / Math.max(metrics.detectedModules.length, 1);
    if (avgUtilization < 0.5) {
      recommendations.push({
        type: 'code_utilization',
        priority: 'medium',
        title: 'Low code utilization detected',
        description: `Average code utilization is ${(avgUtilization * 100).toFixed(1)}%. Dead code may be present.`,
        impact: 'medium',
        effort: 'high',
        actions: [
          'Implement tree shaking optimization',
          'Remove unused imports and exports',
          'Use webpack-bundle-analyzer for detailed analysis'
        ]
      });
    }

    // Check loading performance
    if (metrics.loadingPerformance.mainChunkLoadTime > 1000) {
      recommendations.push({
        type: 'loading_performance',
        priority: 'high',
        title: 'Slow main chunk loading',
        description: `Main chunk loads in ${metrics.loadingPerformance.mainChunkLoadTime.toFixed(2)}ms.`,
        impact: 'high',
        effort: 'medium',
        actions: [
          'Implement preloading for critical resources',
          'Optimize main bundle size',
          'Use CDN for faster resource delivery'
        ]
      });
    }

    // Update optimization metrics
    const optimization: OptimizationMetrics = {
      treeShakingEffectiveness: this.calculateTreeShakingEffectiveness(metrics),
      codeSplittingScore: this.calculateCodeSplittingScore(metrics),
      chunkUtilization: avgUtilization,
      duplicateCodeDetected: this.detectDuplicateCode(metrics.detectedModules)
    };

    // Update metrics with recommendations and optimization data
    this.bundleMetricsSubject.next({
      ...metrics,
      recommendations,
      optimization,
      timestamp: Date.now()
    });
  }

  // =============================================================================
  // CALCULATION METHODS
  // =============================================================================

  /**
   * Calculates parallel loading efficiency
   * 
   * @param resources - JavaScript resources
   * @returns Efficiency score (0-1)
   */
  private calculateParallelLoadingEfficiency(resources: PerformanceResourceTiming[]): number {
    if (resources.length === 0) return 0;

    // Calculate if resources are loaded in parallel
    const loadStartTimes = resources.map(r => r.requestStart).sort((a, b) => a - b);
    const loadEndTimes = resources.map(r => r.responseEnd).sort((a, b) => a - b);
    
    const totalTimeIfSequential = resources.reduce((sum, r) => sum + (r.responseEnd - r.requestStart), 0);
    const actualTotalTime = loadEndTimes[loadEndTimes.length - 1] - loadStartTimes[0];
    
    return actualTotalTime > 0 ? 1 - (actualTotalTime / totalTimeIfSequential) : 0;
  }

  /**
   * Calculates tree shaking effectiveness
   * 
   * @param metrics - Bundle metrics
   * @returns Effectiveness score (0-1)
   */
  private calculateTreeShakingEffectiveness(metrics: BundleAnalysisMetrics): number {
    // Simplified calculation based on bundle size vs expected size
    const expectedSize = metrics.detectedModules.length * 10 * 1024; // Assume 10KB per module
    const actualSize = metrics.totalBundleSize;
    
    return expectedSize > 0 ? Math.max(0, 1 - (actualSize / expectedSize)) : 0;
  }

  /**
   * Calculates code splitting score
   * 
   * @param metrics - Bundle metrics
   * @returns Score (0-1)
   */
  private calculateCodeSplittingScore(metrics: BundleAnalysisMetrics): number {
    if (metrics.chunkCount === 0) return 0;
    
    // Higher score for more chunks and better size distribution
    const chunkDistribution = metrics.lazyChunksSize / Math.max(metrics.totalBundleSize, 1);
    const chunkCount = Math.min(metrics.chunkCount / 10, 1); // Cap at 10 chunks
    
    return (chunkDistribution + chunkCount) / 2;
  }

  /**
   * Detects duplicate code across modules
   * 
   * @param modules - Detected modules
   * @returns Duplicate code percentage
   */
  private detectDuplicateCode(modules: DetectedModule[]): number {
    // Simplified detection based on similar module names
    const moduleNames = modules.map(m => m.name.toLowerCase());
    const uniqueNames = new Set(moduleNames);
    
    return moduleNames.length > 0 ? 1 - (uniqueNames.size / moduleNames.length) : 0;
  }

  /**
   * Estimates module utilization
   * 
   * @param fileName - Module file name
   * @returns Utilization estimate (0-1)
   */
  private estimateModuleUtilization(fileName: string): number {
    // Simplified estimation based on file patterns
    if (fileName.includes('main')) return 0.9;
    if (fileName.includes('vendor')) return 0.7;
    if (fileName.includes('polyfills')) return 0.8;
    if (this.isEvaluationRelatedModule(fileName)) return 0.6;
    return 0.5; // Default estimation
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  /**
   * Checks if a chunk is lazy loaded
   * 
   * @param fileName - File name to check
   * @returns True if lazy loaded
   */
  private isLazyLoadedChunk(fileName: string): boolean {
    return !fileName.includes('main') && 
           !fileName.includes('vendor') && 
           !fileName.includes('polyfills') &&
           /\d+\.[a-f0-9]+\.js$/.test(fileName); // Webpack lazy chunk pattern
  }

  /**
   * Checks if module is evaluation-related
   * 
   * @param fileName - File name to check
   * @returns True if evaluation-related
   */
  private isEvaluationRelatedModule(fileName: string): boolean {
    const evaluationPatterns = [
      'evaluation',
      'discussion',
      'forum',
      'comment',
      'vote',
      'submission'
    ];

    return evaluationPatterns.some(pattern => 
      fileName.toLowerCase().includes(pattern)
    );
  }

  /**
   * Analyzes module dependencies (simplified)
   * 
   * @param modules - Modules to analyze
   */
  private analyzeModuleDependencies(modules: DetectedModule[]): void {
    // Simplified dependency analysis
    modules.forEach(module => {
      // Estimate dependencies based on module type and size
      if (module.type === 'main') {
        module.dependencies = ['vendor', 'polyfills'];
      } else if (module.type === 'lazy') {
        module.dependencies = ['main'];
      }
    });
  }

  /**
   * Sets up resource load tracking
   */
  private setupResourceLoadTracking(): void {
    if ('PerformanceObserver' in window) {
      try {
        this.resourceLoadObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries() as PerformanceResourceTiming[];
          entries.forEach(entry => {
            if (entry.name.endsWith('.js')) {
              const chunkName = entry.name.split('/').pop() || '';
              const loadTime = entry.responseEnd - entry.requestStart;
              this.chunkLoadTimes.set(chunkName, loadTime);
            }
          });
        });

        this.resourceLoadObserver.observe({ 
          entryTypes: ['resource'],
          buffered: true 
        });
      } catch (error) {
        console.warn('Resource load observer not supported:', error);
      }
    }
  }

  /**
   * Initializes bundle monitoring
   */
  private initializeBundleMonitoring(): void {
    console.log('📦 Initializing bundle monitoring...');
    
    // Analyze bundle on page load
    if (document.readyState === 'complete') {
      setTimeout(() => this.analyzeBundleStructure(), 1000);
    } else {
      window.addEventListener('load', () => {
        setTimeout(() => this.analyzeBundleStructure(), 1000);
      });
    }

    // Re-analyze periodically
    setInterval(() => {
      this.analyzeBundleStructure();
    }, 60000); // Every minute
  }

  // =============================================================================
  // PUBLIC METHODS
  // =============================================================================

  /**
   * Gets optimization report
   * 
   * @returns Bundle optimization report
   */
  getOptimizationReport(): BundleOptimizationReport {
    const metrics = this.bundleMetricsSubject.value;
    
    return {
      summary: {
        totalSize: `${(metrics.totalBundleSize / 1024).toFixed(2)}KB`,
        chunkCount: metrics.chunkCount,
        lazyChunkCount: metrics.lazyChunkCount,
        compressionRatio: `${(metrics.compressionRatio * 100).toFixed(1)}%`,
        overallScore: this.calculateOverallOptimizationScore(metrics)
      },
      performance: metrics.loadingPerformance,
      optimization: metrics.optimization,
      recommendations: metrics.recommendations,
      detectedIssues: this.detectOptimizationIssues(metrics),
      timestamp: Date.now()
    };
  }

  /**
   * Logs bundle analysis report
   */
  logBundleReport(): void {
    const report = this.getOptimizationReport();
    
    console.group('📦 Bundle Analysis Report');
    console.log('Summary:', report.summary);
    console.log('Performance:', report.performance);
    console.log('Optimization:', report.optimization);
    
    if (report.recommendations.length > 0) {
      console.group('💡 Recommendations');
      report.recommendations.forEach(rec => {
        console.log(`${rec.priority.toUpperCase()}: ${rec.title}`, rec.description);
      });
      console.groupEnd();
    }
    
    console.groupEnd();
  }

  /**
   * Calculates overall optimization score
   * 
   * @param metrics - Bundle metrics
   * @returns Score (0-100)
   */
  private calculateOverallOptimizationScore(metrics: BundleAnalysisMetrics): number {
    let score = 100;

    // Deduct for large bundle size
    if (metrics.totalBundleSize > 1024 * 1024) score -= 20; // 1MB
    if (metrics.totalBundleSize > 2048 * 1024) score -= 20; // 2MB

    // Deduct for no lazy loading
    if (metrics.lazyChunkCount === 0) score -= 15;

    // Deduct for poor compression
    if (metrics.compressionRatio < 0.5) score -= 10;

    // Deduct for slow loading
    if (metrics.loadingPerformance.mainChunkLoadTime > 1000) score -= 15;

    // Deduct for low utilization
    if (metrics.optimization.chunkUtilization < 0.5) score -= 10;

    return Math.max(0, score);
  }

  /**
   * Detects optimization issues
   * 
   * @param metrics - Bundle metrics
   * @returns Array of detected issues
   */
  private detectOptimizationIssues(metrics: BundleAnalysisMetrics): string[] {
    const issues: string[] = [];

    if (metrics.totalBundleSize > 1024 * 1024) {
      issues.push('Bundle size exceeds 1MB');
    }

    if (metrics.lazyChunkCount === 0) {
      issues.push('No lazy loading implemented');
    }

    if (metrics.loadingPerformance.mainChunkLoadTime > 1000) {
      issues.push('Slow main chunk loading');
    }

    if (metrics.optimization.duplicateCodeDetected > 0.1) {
      issues.push('Duplicate code detected');
    }

    return issues;
  }

  // =============================================================================
  // CLEANUP
  // =============================================================================

  /**
   * Cleans up bundle analyzer service
   */
  destroy(): void {
    if (this.resourceLoadObserver) {
      this.resourceLoadObserver.disconnect();
    }
    
    this.bundleMetricsSubject.complete();
    this.chunkLoadTimes.clear();
    
    console.log('📦 Bundle analyzer service destroyed');
  }
}

// =============================================================================
// INTERFACES
// =============================================================================

export interface BundleAnalysisMetrics {
  totalBundleSize: number;
  mainChunkSize: number;
  lazyChunksSize: number;
  vendorChunkSize: number;
  chunkCount: number;
  lazyChunkCount: number;
  compressionRatio: number;
  loadingPerformance: LoadingPerformance;
  optimization: OptimizationMetrics;
  recommendations: OptimizationRecommendation[];
  detectedModules: DetectedModule[];
  timestamp: number;
}

export interface LoadingPerformance {
  mainChunkLoadTime: number;
  averageLazyChunkLoadTime: number;
  totalLoadTime: number;
  parallelLoadingEfficiency: number;
}

export interface OptimizationMetrics {
  treeShakingEffectiveness: number;
  codeSplittingScore: number;
  chunkUtilization: number;
  duplicateCodeDetected: number;
}

export interface OptimizationRecommendation {
  type: 'bundle_size' | 'lazy_loading' | 'compression' | 'code_utilization' | 'loading_performance';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  effort: 'low' | 'medium' | 'high';
  actions: string[];
}

export interface DetectedModule {
  name: string;
  type: ModuleType;
  size: number;
  loadTime: number;
  isLazyLoaded: boolean;
  isEvaluationRelated: boolean;
  dependencies: string[];
  utilization: number;
  lastAccessed: number;
}

export type ModuleType = 'main' | 'vendor' | 'polyfills' | 'lazy' | 'unknown';

export interface BundleOptimizationReport {
  summary: {
    totalSize: string;
    chunkCount: number;
    lazyChunkCount: number;
    compressionRatio: string;
    overallScore: number;
  };
  performance: LoadingPerformance;
  optimization: OptimizationMetrics;
  recommendations: OptimizationRecommendation[];
  detectedIssues: string[];
  timestamp: number;
}