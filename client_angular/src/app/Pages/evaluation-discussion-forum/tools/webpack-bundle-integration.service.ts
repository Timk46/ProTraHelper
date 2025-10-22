import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

/**
 * Webpack bundle integration service for performance analysis
 * 
 * @description This service integrates with webpack bundle analyzer
 * and provides insights about the application's bundle structure.
 * It helps identify optimization opportunities and track bundle size.
 * 
 * Features:
 * - Bundle size analysis
 * - Module dependency tracking
 * - Chunk analysis
 * - Tree shaking effectiveness
 * - Code splitting recommendations
 * 
 * @example
 * ```typescript
 * constructor(private bundleIntegration: WebpackBundleIntegrationService) {
 *   this.bundleIntegration.generateBundleReport().then(report => {
 *     console.log('Bundle report:', report);
 *   });
 * }
 * ```
 */
@Injectable({
  providedIn: 'root'
})
export class WebpackBundleIntegrationService {

  private bundleReportSubject = new BehaviorSubject<WebpackBundleReport>({
    totalSize: 0,
    chunks: [],
    modules: [],
    assets: [],
    warnings: [],
    recommendations: [],
    timestamp: Date.now()
  });

  constructor() {
    this.initializeBundleAnalysis();
  }

  // =============================================================================
  // PUBLIC OBSERVABLES
  // =============================================================================

  /**
   * Observable for bundle report updates
   */
  get bundleReport$(): Observable<WebpackBundleReport> {
    return this.bundleReportSubject.asObservable();
  }

  // =============================================================================
  // BUNDLE ANALYSIS
  // =============================================================================

  /**
   * Generates a comprehensive bundle report
   * 
   * @returns Promise resolving to bundle report
   */
  async generateBundleReport(): Promise<WebpackBundleReport> {
    console.log('📦 Generating webpack bundle report...');

    try {
      // Analyze loaded resources
      const resources = this.analyzeLoadedResources();
      
      // Analyze chunks
      const chunks = this.analyzeChunks(resources);
      
      // Analyze modules (simplified)
      const modules = this.analyzeModules();
      
      // Analyze assets
      const assets = this.analyzeAssets(resources);
      
      // Generate warnings and recommendations
      const warnings = this.generateWarnings(chunks, assets);
      const recommendations = this.generateRecommendations(chunks, modules, assets);

      const report: WebpackBundleReport = {
        totalSize: chunks.reduce((sum, chunk) => sum + chunk.size, 0),
        chunks,
        modules,
        assets,
        warnings,
        recommendations,
        timestamp: Date.now()
      };

      this.bundleReportSubject.next(report);
      
      return report;
    } catch (error) {
      console.error('❌ Error generating bundle report:', error);
      throw error;
    }
  }

  /**
   * Exports bundle report in webpack-bundle-analyzer compatible format
   * 
   * @returns Bundle analyzer compatible data
   */
  exportForBundleAnalyzer(): BundleAnalyzerData {
    const report = this.bundleReportSubject.value;
    
    return {
      version: '1.0.0',
      generator: 'HEFL Performance Monitor',
      generatedAt: new Date().toISOString(),
      bundler: {
        name: 'Angular CLI',
        version: '17.x'
      },
      chunks: report.chunks.map(chunk => ({
        id: chunk.id,
        names: [chunk.name],
        files: [chunk.fileName],
        size: chunk.size,
        modules: chunk.modules || []
      })),
      modules: report.modules.map(module => ({
        id: module.id,
        name: module.name,
        size: module.size,
        chunks: module.chunks || [],
        dependencies: module.dependencies || []
      })),
      assets: report.assets.map(asset => ({
        name: asset.name,
        size: asset.size,
        chunks: asset.chunks || []
      }))
    };
  }

  // =============================================================================
  // ANALYSIS METHODS
  // =============================================================================

  /**
   * Analyzes loaded JavaScript resources
   * 
   * @returns Array of resource information
   */
  private analyzeLoadedResources(): ResourceInfo[] {
    const resources: ResourceInfo[] = [];
    
    if ('performance' in window) {
      const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      
      entries
        .filter(entry => entry.name.endsWith('.js'))
        .forEach((entry, index) => {
          const fileName = entry.name.split('/').pop() || '';
          
          resources.push({
            index,
            name: fileName,
            url: entry.name,
            size: entry.transferSize || 0,
            loadTime: entry.responseEnd - entry.requestStart,
            type: this.determineResourceType(fileName)
          });
        });
    }

    return resources.sort((a, b) => b.size - a.size);
  }

  /**
   * Analyzes webpack chunks from resources
   * 
   * @param resources - Resource information
   * @returns Array of chunk information
   */
  private analyzeChunks(resources: ResourceInfo[]): ChunkInfo[] {
    const chunks: ChunkInfo[] = [];
    
    resources.forEach((resource, index) => {
      const chunk: ChunkInfo = {
        id: index.toString(),
        name: this.extractChunkName(resource.name),
        fileName: resource.name,
        size: resource.size,
        type: this.mapResourceTypeToChunkType(resource.type),
        loadTime: resource.loadTime,
        isLazyLoaded: this.isLazyLoadedChunk(resource.name),
        modules: [], // Simplified - would need webpack stats for actual module info
        dependencies: []
      };

      chunks.push(chunk);
    });

    return chunks;
  }

  /**
   * Analyzes modules (simplified without webpack stats)
   * 
   * @returns Array of module information
   */
  private analyzeModules(): ModuleInfo[] {
    const modules: ModuleInfo[] = [];
    
    // This is a simplified analysis - real module analysis would require webpack stats
    // For now, we estimate based on common patterns
    
    const estimatedModules = [
      { name: '@angular/core', estimatedSize: 150 * 1024, type: 'vendor' },
      { name: '@angular/common', estimatedSize: 100 * 1024, type: 'vendor' },
      { name: '@angular/forms', estimatedSize: 80 * 1024, type: 'vendor' },
      { name: '@angular/router', estimatedSize: 70 * 1024, type: 'vendor' },
      { name: '@angular/material', estimatedSize: 200 * 1024, type: 'vendor' },
      { name: 'rxjs', estimatedSize: 120 * 1024, type: 'vendor' },
      { name: 'evaluation-components', estimatedSize: 50 * 1024, type: 'app' },
      { name: 'shared-services', estimatedSize: 30 * 1024, type: 'app' }
    ];

    estimatedModules.forEach((module, index) => {
      modules.push({
        id: index.toString(),
        name: module.name,
        size: module.estimatedSize,
        type: module.type as 'app' | 'vendor',
        chunks: [],
        dependencies: [],
        isUsed: true,
        treeShakable: module.type === 'app'
      });
    });

    return modules;
  }

  /**
   * Analyzes assets from resources
   * 
   * @param resources - Resource information
   * @returns Array of asset information
   */
  private analyzeAssets(resources: ResourceInfo[]): AssetInfo[] {
    return resources.map((resource, index) => ({
      id: index.toString(),
      name: resource.name,
      size: resource.size,
      type: resource.type,
      isCompressed: this.isCompressed(resource.name),
      compressionRatio: this.estimateCompressionRatio(resource.name),
      chunks: []
    }));
  }

  /**
   * Generates warnings based on analysis
   * 
   * @param chunks - Chunk information
   * @param assets - Asset information
   * @returns Array of warnings
   */
  private generateWarnings(chunks: ChunkInfo[], assets: AssetInfo[]): BundleWarning[] {
    const warnings: BundleWarning[] = [];
    
    // Check for large chunks
    chunks.forEach(chunk => {
      if (chunk.size > 500 * 1024) { // 500KB
        warnings.push({
          type: 'large_chunk',
          severity: chunk.size > 1024 * 1024 ? 'error' : 'warning',
          message: `Large chunk detected: ${chunk.name} (${this.formatSize(chunk.size)})`,
          details: {
            chunkName: chunk.name,
            size: chunk.size,
            recommendation: 'Consider code splitting or lazy loading'
          }
        });
      }
    });

    // Check for missing compression
    assets.forEach(asset => {
      if (asset.size > 100 * 1024 && !asset.isCompressed) { // 100KB
        warnings.push({
          type: 'missing_compression',
          severity: 'warning',
          message: `Uncompressed asset: ${asset.name} (${this.formatSize(asset.size)})`,
          details: {
            assetName: asset.name,
            size: asset.size,
            recommendation: 'Enable gzip/brotli compression'
          }
        });
      }
    });

    // Check for duplicate dependencies (simplified)
    const chunkNames = chunks.map(c => c.name);
    const duplicates = chunkNames.filter((name, index) => 
      chunkNames.indexOf(name) !== index
    );
    
    if (duplicates.length > 0) {
      warnings.push({
        type: 'duplicate_dependencies',
        severity: 'warning',
        message: `Potential duplicate dependencies detected`,
        details: {
          duplicates,
          recommendation: 'Review bundle splitting strategy'
        }
      });
    }

    return warnings;
  }

  /**
   * Generates optimization recommendations
   * 
   * @param chunks - Chunk information
   * @param modules - Module information
   * @param assets - Asset information
   * @returns Array of recommendations
   */
  private generateRecommendations(
    chunks: ChunkInfo[], 
    modules: ModuleInfo[], 
    assets: AssetInfo[]
  ): BundleRecommendation[] {
    const recommendations: BundleRecommendation[] = [];
    
    // Recommend lazy loading if no lazy chunks exist
    const lazyChunks = chunks.filter(c => c.isLazyLoaded);
    if (lazyChunks.length === 0) {
      recommendations.push({
        type: 'lazy_loading',
        priority: 'medium',
        title: 'Implement lazy loading',
        description: 'No lazy loaded chunks detected. Consider implementing lazy loading for feature modules.',
        impact: 'medium',
        effort: 'medium',
        steps: [
          'Identify feature modules that can be lazy loaded',
          'Configure lazy loading in routing',
          'Use dynamic imports for components'
        ]
      });
    }

    // Recommend tree shaking optimization
    const nonTreeShakableModules = modules.filter(m => !m.treeShakable);
    if (nonTreeShakableModules.length > 0) {
      recommendations.push({
        type: 'tree_shaking',
        priority: 'high',
        title: 'Optimize tree shaking',
        description: `${nonTreeShakableModules.length} modules may not be tree-shakable.`,
        impact: 'high',
        effort: 'high',
        steps: [
          'Review import statements',
          'Use ES6 imports instead of CommonJS',
          'Configure webpack for better tree shaking'
        ]
      });
    }

    // Recommend compression if many uncompressed assets
    const uncompressedAssets = assets.filter(a => !a.isCompressed && a.size > 50 * 1024);
    if (uncompressedAssets.length > 2) {
      recommendations.push({
        type: 'compression',
        priority: 'high',
        title: 'Enable asset compression',
        description: `${uncompressedAssets.length} large assets are not compressed.`,
        impact: 'high',
        effort: 'low',
        steps: [
          'Enable gzip compression on server',
          'Consider brotli compression',
          'Configure build pipeline for compression'
        ]
      });
    }

    // Recommend code splitting if main bundle is too large
    const mainChunk = chunks.find(c => c.name.includes('main'));
    if (mainChunk && mainChunk.size > 1024 * 1024) { // 1MB
      recommendations.push({
        type: 'code_splitting',
        priority: 'critical',
        title: 'Implement code splitting',
        description: `Main bundle is ${this.formatSize(mainChunk.size)}. Consider code splitting.`,
        impact: 'high',
        effort: 'medium',
        steps: [
          'Split vendor code into separate chunk',
          'Implement route-based code splitting',
          'Use dynamic imports for large features'
        ]
      });
    }

    return recommendations;
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  /**
   * Determines resource type from filename
   * 
   * @param fileName - File name
   * @returns Resource type
   */
  private determineResourceType(fileName: string): 'main' | 'vendor' | 'lazy' | 'polyfills' {
    if (fileName.includes('main')) return 'main';
    if (fileName.includes('vendor') || fileName.includes('polyfills')) return 'vendor';
    if (fileName.includes('polyfills')) return 'polyfills';
    if (/\d+\.[a-f0-9]+\.js$/.test(fileName)) return 'lazy';
    return 'main';
  }

  /**
   * Extracts chunk name from file name
   * 
   * @param fileName - File name
   * @returns Chunk name
   */
  private extractChunkName(fileName: string): string {
    // Remove hash from filename
    return fileName.replace(/\.[a-f0-9]+\.js$/, '');
  }

  /**
   * Checks if chunk is lazy loaded
   * 
   * @param fileName - File name
   * @returns True if lazy loaded
   */
  private isLazyLoadedChunk(fileName: string): boolean {
    return /\d+\.[a-f0-9]+\.js$/.test(fileName);
  }

  /**
   * Checks if asset is compressed
   * 
   * @param fileName - File name
   * @returns True if compressed
   */
  private isCompressed(fileName: string): boolean {
    // Simplified check - would need server headers for accurate detection
    return fileName.includes('.gz') || fileName.includes('.br');
  }

  /**
   * Estimates compression ratio
   * 
   * @param fileName - File name
   * @returns Estimated compression ratio
   */
  private estimateCompressionRatio(fileName: string): number {
    // Simplified estimation
    if (fileName.includes('.gz')) return 0.3;
    if (fileName.includes('.br')) return 0.25;
    return 0.7; // Assume some compression exists
  }

  /**
   * Formats file size for display
   * 
   * @param bytes - Size in bytes
   * @returns Formatted string
   */
  private formatSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // =============================================================================
  // INITIALIZATION
  // =============================================================================

  /**
   * Initializes bundle analysis
   */
  private initializeBundleAnalysis(): void {
    // Generate initial report after page load
    if (document.readyState === 'complete') {
      setTimeout(() => this.generateBundleReport(), 2000);
    } else {
      window.addEventListener('load', () => {
        setTimeout(() => this.generateBundleReport(), 2000);
      });
    }
  }

  // =============================================================================
  // PUBLIC API
  // =============================================================================

  /**
   * Downloads bundle report as JSON
   */
  downloadBundleReport(): void {
    const report = this.bundleReportSubject.value;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `bundle-report-${Date.now()}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
    console.log('📄 Bundle report downloaded');
  }

  /**
   * Gets optimization summary
   * 
   * @returns Optimization summary
   */
  getOptimizationSummary(): OptimizationSummary {
    const report = this.bundleReportSubject.value;
    
    return {
      totalSize: this.formatSize(report.totalSize),
      chunkCount: report.chunks.length,
      lazyChunks: report.chunks.filter(c => c.isLazyLoaded).length,
      warningCount: report.warnings.length,
      recommendationCount: report.recommendations.length,
      topRecommendations: report.recommendations
        .filter(r => r.priority === 'critical' || r.priority === 'high')
        .slice(0, 3)
    };
  }

  /**
   * Maps resource type to valid ChunkInfo type
   * 
   * @param resourceType - Resource type from performance API
   * @returns Valid chunk type
   */
  private mapResourceTypeToChunkType(resourceType: string): 'main' | 'vendor' | 'lazy' | 'polyfills' {
    if (resourceType === 'main' || resourceType === 'vendor' || resourceType === 'lazy' || resourceType === 'polyfills') {
      return resourceType as 'main' | 'vendor' | 'lazy' | 'polyfills';
    }
    
    // Fallback mapping based on resource type
    switch (resourceType.toLowerCase()) {
      case 'script':
      case 'document':
        return 'main';
      case 'polyfill':
        return 'polyfills';
      default:
        return 'main';
    }
  }
}

// =============================================================================
// INTERFACES
// =============================================================================

export interface WebpackBundleReport {
  totalSize: number;
  chunks: ChunkInfo[];
  modules: ModuleInfo[];
  assets: AssetInfo[];
  warnings: BundleWarning[];
  recommendations: BundleRecommendation[];
  timestamp: number;
}

export interface ChunkInfo {
  id: string;
  name: string;
  fileName: string;
  size: number;
  type: 'main' | 'vendor' | 'lazy' | 'polyfills';
  loadTime: number;
  isLazyLoaded: boolean;
  modules: string[];
  dependencies: string[];
}

export interface ModuleInfo {
  id: string;
  name: string;
  size: number;
  type: 'app' | 'vendor';
  chunks: string[];
  dependencies: string[];
  isUsed: boolean;
  treeShakable: boolean;
}

export interface AssetInfo {
  id: string;
  name: string;
  size: number;
  type: string;
  isCompressed: boolean;
  compressionRatio: number;
  chunks: string[];
}

export interface ResourceInfo {
  index: number;
  name: string;
  url: string;
  size: number;
  loadTime: number;
  type: string;
}

export interface BundleWarning {
  type: 'large_chunk' | 'missing_compression' | 'duplicate_dependencies';
  severity: 'warning' | 'error';
  message: string;
  details: any;
}

export interface BundleRecommendation {
  type: 'lazy_loading' | 'tree_shaking' | 'compression' | 'code_splitting';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  effort: 'low' | 'medium' | 'high';
  steps: string[];
}

export interface BundleAnalyzerData {
  version: string;
  generator: string;
  generatedAt: string;
  bundler: {
    name: string;
    version: string;
  };
  chunks: any[];
  modules: any[];
  assets: any[];
}

export interface OptimizationSummary {
  totalSize: string;
  chunkCount: number;
  lazyChunks: number;
  warningCount: number;
  recommendationCount: number;
  topRecommendations: BundleRecommendation[];
}