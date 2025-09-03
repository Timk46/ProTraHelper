import { Component, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, combineLatest, interval } from 'rxjs';
import { map, takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';

import { EvaluationPerformanceService, PerformanceMetrics, ComponentProfiling } from '../../services/evaluation-performance.service';
import { BundleAnalyzerService, BundleAnalysisMetrics, OptimizationRecommendation } from '../../services/bundle-analyzer.service';

/**
 * Performance dashboard component for real-time monitoring
 * 
 * @description This component provides a comprehensive real-time dashboard
 * for monitoring the performance of the evaluation discussion forum.
 * It displays metrics, charts, and recommendations for optimization.
 * 
 * Features:
 * - Real-time performance metrics display
 * - Component profiling visualization
 * - Bundle analysis charts
 * - Memory usage monitoring
 * - Web Vitals tracking
 * - Optimization recommendations
 * - Performance alerts and warnings
 * 
 * @example
 * ```html
 * <app-performance-dashboard 
 *   [showDetailedMetrics]="true"
 *   [autoRefresh]="true"
 *   (onRecommendationClick)="handleRecommendation($event)">
 * </app-performance-dashboard>
 * ```
 */
@Component({
  selector: 'app-performance-dashboard',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="performance-dashboard" *ngIf="dashboardData$ | async as data">
      
      <!-- Dashboard Header -->
      <div class="dashboard-header">
        <h2 class="dashboard-title">
          🚀 Performance Dashboard
          <span class="status-indicator" [class]="'status-' + data.healthStatus">
            {{ data.healthStatus }}
          </span>
        </h2>
        <div class="dashboard-actions">
          <button (click)="refreshMetrics()" class="refresh-btn">
            🔄 Refresh
          </button>
          <button (click)="toggleAutoRefresh()" class="auto-refresh-btn" 
                  [class.active]="autoRefreshEnabled">
            ⚡ Auto Refresh
          </button>
          <button (click)="exportReport()" class="export-btn">
            📊 Export Report
          </button>
        </div>
      </div>

      <!-- Overall Score -->
      <div class="score-section">
        <div class="score-card">
          <div class="score-value">{{ data.overallScore }}</div>
          <div class="score-label">Overall Score</div>
          <div class="score-bar">
            <div class="score-fill" [style.width.%]="data.overallScore"></div>
          </div>
        </div>
      </div>

      <!-- Key Metrics Grid -->
      <div class="metrics-grid">
        
        <!-- Memory Metrics -->
        <div class="metric-card memory-card">
          <div class="card-header">
            <h3>💾 Memory Usage</h3>
            <span class="metric-status" [class]="'status-' + data.memoryHealth">
              {{ data.memoryHealth }}
            </span>
          </div>
          <div class="card-content">
            <div class="memory-usage">
              <div class="usage-bar">
                <div class="usage-fill" 
                     [style.width.%]="(data.memoryMetrics.usedJSHeapSize / data.memoryMetrics.jsHeapSizeLimit) * 100">
                </div>
              </div>
              <div class="usage-text">
                {{ formatBytes(data.memoryMetrics.usedJSHeapSize) }} / 
                {{ formatBytes(data.memoryMetrics.jsHeapSizeLimit) }}
              </div>
            </div>
            <div class="memory-details">
              <div class="detail-item">
                <span>Pressure:</span>
                <span [class]="'pressure-' + data.memoryMetrics.memoryPressure">
                  {{ data.memoryMetrics.memoryPressure }}
                </span>
              </div>
              <div class="detail-item">
                <span>Leaks:</span>
                <span [class.warning]="data.memoryMetrics.leakCount > 0">
                  {{ data.memoryMetrics.leakCount }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Network Metrics -->
        <div class="metric-card network-card">
          <div class="card-header">
            <h3>🌐 Network</h3>
            <span class="metric-status" [class]="'status-' + data.networkHealth">
              {{ data.networkHealth }}
            </span>
          </div>
          <div class="card-content">
            <div class="network-stats">
              <div class="stat-item">
                <div class="stat-value">{{ data.networkMetrics.totalRequests }}</div>
                <div class="stat-label">Requests</div>
              </div>
              <div class="stat-item">
                <div class="stat-value">{{ data.networkMetrics.averageResponseTime.toFixed(0) }}ms</div>
                <div class="stat-label">Avg Response</div>
              </div>
              <div class="stat-item">
                <div class="stat-value">{{ (data.networkMetrics.cacheHitRate * 100).toFixed(1) }}%</div>
                <div class="stat-label">Cache Hit</div>
              </div>
              <div class="stat-item">
                <div class="stat-value">{{ data.networkMetrics.failedRequests }}</div>
                <div class="stat-label">Failures</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Web Vitals -->
        <div class="metric-card vitals-card">
          <div class="card-header">
            <h3>⚡ Web Vitals</h3>
          </div>
          <div class="card-content">
            <div class="vitals-grid">
              <div class="vital-item">
                <div class="vital-label">LCP</div>
                <div class="vital-value" [class]="getVitalStatus('lcp', data.webVitals.lcp)">
                  {{ data.webVitals.lcp.toFixed(0) }}ms
                </div>
              </div>
              <div class="vital-item">
                <div class="vital-label">FID</div>
                <div class="vital-value" [class]="getVitalStatus('fid', data.webVitals.fid)">
                  {{ data.webVitals.fid.toFixed(0) }}ms
                </div>
              </div>
              <div class="vital-item">
                <div class="vital-label">CLS</div>
                <div class="vital-value" [class]="getVitalStatus('cls', data.webVitals.cls)">
                  {{ data.webVitals.cls.toFixed(3) }}
                </div>
              </div>
              <div class="vital-item">
                <div class="vital-label">TTFB</div>
                <div class="vital-value" [class]="getVitalStatus('ttfb', data.webVitals.ttfb)">
                  {{ data.webVitals.ttfb.toFixed(0) }}ms
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Bundle Analysis -->
        <div class="metric-card bundle-card">
          <div class="card-header">
            <h3>📦 Bundle Analysis</h3>
          </div>
          <div class="card-content">
            <div class="bundle-stats">
              <div class="bundle-size">
                <div class="size-value">{{ formatBytes(data.bundleMetrics.totalBundleSize) }}</div>
                <div class="size-label">Total Size</div>
              </div>
              <div class="bundle-details">
                <div class="detail-row">
                  <span>Chunks:</span>
                  <span>{{ data.bundleMetrics.chunkCount }}</span>
                </div>
                <div class="detail-row">
                  <span>Lazy:</span>
                  <span>{{ data.bundleMetrics.lazyChunkCount }}</span>
                </div>
                <div class="detail-row">
                  <span>Compression:</span>
                  <span>{{ (data.bundleMetrics.compressionRatio * 100).toFixed(1) }}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      <!-- Component Performance -->
      <div class="section components-section" *ngIf="data.componentMetrics.size > 0">
        <h3 class="section-title">🧩 Component Performance</h3>
        <div class="components-grid">
          <div class="component-card" *ngFor="let component of data.componentMetricsArray">
            <div class="component-header">
              <span class="component-name">{{ component.componentName }}</span>
              <span class="component-status" [class]="getComponentStatus(component)">
                {{ getComponentStatusText(component) }}
              </span>
            </div>
            <div class="component-stats">
              <div class="stat-row">
                <span>Renders:</span>
                <span>{{ component.renderCount }}</span>
              </div>
              <div class="stat-row">
                <span>Avg Time:</span>
                <span>{{ component.averageRenderTime.toFixed(2) }}ms</span>
              </div>
              <div class="stat-row">
                <span>Max Time:</span>
                <span>{{ component.maxRenderTime.toFixed(2) }}ms</span>
              </div>
              <div class="stat-row">
                <span>Changes:</span>
                <span>{{ component.changeDetectionCycles }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Recommendations -->
      <div class="section recommendations-section" *ngIf="data.recommendations.length > 0">
        <h3 class="section-title">💡 Optimization Recommendations</h3>
        <div class="recommendations-list">
          <div class="recommendation-card" 
               *ngFor="let rec of data.recommendations" 
               [class]="'priority-' + rec.priority">
            <div class="rec-header">
              <span class="rec-title">{{ rec.title }}</span>
              <span class="rec-priority">{{ rec.priority }}</span>
            </div>
            <div class="rec-description">{{ rec.description }}</div>
            <div class="rec-impact">
              <span>Impact: {{ rec.impact }}</span>
              <span>Effort: {{ rec.effort }}</span>
            </div>
            <div class="rec-actions" *ngIf="rec.actions.length > 0">
              <div class="action-item" *ngFor="let action of rec.actions">
                • {{ action }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Performance Chart Placeholder -->
      <div class="section chart-section">
        <h3 class="section-title">📈 Performance Trends</h3>
        <div class="chart-placeholder">
          <div class="placeholder-text">
            📊 Real-time performance charts would be displayed here
          </div>
          <div class="placeholder-info">
            (Integration with Chart.js or D3.js for production)
          </div>
        </div>
      </div>

      <!-- Debug Information -->
      <div class="section debug-section" *ngIf="showDebugInfo">
        <h3 class="section-title">🔍 Debug Information</h3>
        <div class="debug-content">
          <pre>{{ debugInfo | json }}</pre>
        </div>
      </div>

    </div>
  `,
  styles: [`
    .performance-dashboard {
      padding: 20px;
      max-width: 1400px;
      margin: 0 auto;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    }

    .dashboard-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 30px;
      padding: 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 12px;
      color: white;
    }

    .dashboard-title {
      margin: 0;
      font-size: 1.5rem;
      display: flex;
      align-items: center;
      gap: 15px;
    }

    .status-indicator {
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 0.8rem;
      text-transform: uppercase;
      font-weight: bold;
    }

    .status-good { background: #4CAF50; }
    .status-warning { background: #FF9800; }
    .status-critical { background: #F44336; }

    .dashboard-actions {
      display: flex;
      gap: 10px;
    }

    .dashboard-actions button {
      padding: 8px 16px;
      border: none;
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.2);
      color: white;
      cursor: pointer;
      transition: background 0.2s;
    }

    .dashboard-actions button:hover {
      background: rgba(255, 255, 255, 0.3);
    }

    .dashboard-actions button.active {
      background: rgba(255, 255, 255, 0.4);
    }

    .score-section {
      margin-bottom: 30px;
    }

    .score-card {
      text-align: center;
      padding: 30px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
      border: 1px solid #e0e0e0;
    }

    .score-value {
      font-size: 3rem;
      font-weight: bold;
      color: #4CAF50;
      margin-bottom: 10px;
    }

    .score-label {
      font-size: 1.1rem;
      color: #666;
      margin-bottom: 20px;
    }

    .score-bar {
      height: 8px;
      background: #f0f0f0;
      border-radius: 4px;
      overflow: hidden;
    }

    .score-fill {
      height: 100%;
      background: linear-gradient(90deg, #4CAF50, #8BC34A);
      transition: width 0.5s ease;
    }

    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }

    .metric-card {
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
      border: 1px solid #e0e0e0;
      overflow: hidden;
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px;
      border-bottom: 1px solid #f0f0f0;
      background: #fafafa;
    }

    .card-header h3 {
      margin: 0;
      font-size: 1rem;
      color: #333;
    }

    .metric-status {
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 0.7rem;
      text-transform: uppercase;
      font-weight: bold;
    }

    .card-content {
      padding: 20px;
    }

    /* Memory Card Styles */
    .memory-usage {
      margin-bottom: 15px;
    }

    .usage-bar {
      height: 8px;
      background: #f0f0f0;
      border-radius: 4px;
      overflow: hidden;
      margin-bottom: 8px;
    }

    .usage-fill {
      height: 100%;
      background: linear-gradient(90deg, #4CAF50, #FF9800, #F44336);
      transition: width 0.3s ease;
    }

    .usage-text {
      font-size: 0.9rem;
      color: #666;
      text-align: center;
    }

    .memory-details {
      display: flex;
      justify-content: space-between;
    }

    .detail-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
    }

    .detail-item span:first-child {
      font-size: 0.8rem;
      color: #999;
    }

    .pressure-low { color: #4CAF50; }
    .pressure-medium { color: #FF9800; }
    .pressure-high { color: #F44336; }
    .pressure-critical { color: #D32F2F; font-weight: bold; }

    .warning { color: #FF9800; font-weight: bold; }

    /* Network Card Styles */
    .network-stats {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 15px;
    }

    .stat-item {
      text-align: center;
    }

    .stat-value {
      font-size: 1.5rem;
      font-weight: bold;
      color: #333;
    }

    .stat-label {
      font-size: 0.8rem;
      color: #999;
      margin-top: 4px;
    }

    /* Web Vitals Styles */
    .vitals-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 15px;
    }

    .vital-item {
      text-align: center;
      padding: 10px;
      border-radius: 8px;
      background: #f8f9fa;
    }

    .vital-label {
      font-size: 0.8rem;
      color: #666;
      margin-bottom: 5px;
    }

    .vital-value {
      font-size: 1.2rem;
      font-weight: bold;
    }

    .vital-good { color: #4CAF50; }
    .vital-needs-improvement { color: #FF9800; }
    .vital-poor { color: #F44336; }

    /* Bundle Card Styles */
    .bundle-stats {
      display: flex;
      align-items: center;
      gap: 20px;
    }

    .bundle-size {
      text-align: center;
    }

    .size-value {
      font-size: 1.8rem;
      font-weight: bold;
      color: #333;
    }

    .size-label {
      font-size: 0.9rem;
      color: #666;
    }

    .bundle-details {
      flex: 1;
    }

    .detail-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
      font-size: 0.9rem;
    }

    .detail-row span:first-child {
      color: #666;
    }

    .detail-row span:last-child {
      font-weight: 500;
    }

    /* Section Styles */
    .section {
      margin-bottom: 30px;
    }

    .section-title {
      font-size: 1.2rem;
      margin-bottom: 20px;
      color: #333;
      border-bottom: 2px solid #e0e0e0;
      padding-bottom: 10px;
    }

    /* Component Performance Styles */
    .components-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 15px;
    }

    .component-card {
      background: white;
      border-radius: 8px;
      border: 1px solid #e0e0e0;
      overflow: hidden;
    }

    .component-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 15px;
      background: #f8f9fa;
      border-bottom: 1px solid #e0e0e0;
    }

    .component-name {
      font-weight: 500;
      color: #333;
    }

    .component-status {
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 0.7rem;
      text-transform: uppercase;
    }

    .status-excellent { background: #E8F5E8; color: #2E7D32; }
    .status-good { background: #FFF3E0; color: #F57C00; }
    .status-needs-attention { background: #FFEBEE; color: #C62828; }

    .component-stats {
      padding: 15px;
    }

    .stat-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
      font-size: 0.9rem;
    }

    .stat-row span:first-child {
      color: #666;
    }

    .stat-row span:last-child {
      font-weight: 500;
    }

    /* Recommendations Styles */
    .recommendations-list {
      display: flex;
      flex-direction: column;
      gap: 15px;
    }

    .recommendation-card {
      background: white;
      border-radius: 8px;
      border: 1px solid #e0e0e0;
      overflow: hidden;
    }

    .priority-high {
      border-left: 4px solid #F44336;
    }

    .priority-medium {
      border-left: 4px solid #FF9800;
    }

    .priority-low {
      border-left: 4px solid #4CAF50;
    }

    .rec-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 15px;
      background: #f8f9fa;
      border-bottom: 1px solid #e0e0e0;
    }

    .rec-title {
      font-weight: 500;
      color: #333;
    }

    .rec-priority {
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 0.7rem;
      text-transform: uppercase;
      background: #e0e0e0;
      color: #666;
    }

    .rec-description {
      padding: 15px;
      color: #666;
      line-height: 1.5;
    }

    .rec-impact {
      padding: 0 15px;
      display: flex;
      gap: 20px;
      font-size: 0.9rem;
      color: #888;
    }

    .rec-actions {
      padding: 15px;
      background: #f8f9fa;
    }

    .action-item {
      margin-bottom: 5px;
      color: #666;
      font-size: 0.9rem;
    }

    /* Chart Section */
    .chart-placeholder {
      height: 300px;
      background: #f8f9fa;
      border: 2px dashed #ccc;
      border-radius: 8px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
    }

    .placeholder-text {
      font-size: 1.1rem;
      color: #666;
      margin-bottom: 10px;
    }

    .placeholder-info {
      font-size: 0.9rem;
      color: #999;
    }

    /* Debug Section */
    .debug-content pre {
      background: #f8f9fa;
      padding: 15px;
      border-radius: 8px;
      overflow-x: auto;
      font-size: 0.8rem;
      max-height: 400px;
    }

    /* Responsive Design */
    @media (max-width: 768px) {
      .dashboard-header {
        flex-direction: column;
        gap: 15px;
        text-align: center;
      }

      .dashboard-actions {
        flex-wrap: wrap;
        justify-content: center;
      }

      .metrics-grid {
        grid-template-columns: 1fr;
      }

      .network-stats {
        grid-template-columns: 1fr;
      }

      .vitals-grid {
        grid-template-columns: 1fr;
      }

      .bundle-stats {
        flex-direction: column;
        text-align: center;
      }
    }
  `]
})
export class PerformanceDashboardComponent implements OnInit, OnDestroy {
  
  dashboardData$!: Observable<DashboardData>;
  autoRefreshEnabled = true;
  showDebugInfo = false;
  debugInfo: any = {};

  private destroy$ = new Subject<void>();

  constructor(
    private performanceService: EvaluationPerformanceService,
    private bundleAnalyzer: BundleAnalyzerService
  ) {}

  // =============================================================================
  // LIFECYCLE
  // =============================================================================

  ngOnInit(): void {
    this.initializeDashboard();
    this.setupAutoRefresh();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // =============================================================================
  // INITIALIZATION
  // =============================================================================

  /**
   * Initializes the performance dashboard
   */
  private initializeDashboard(): void {
    // Combine all performance data streams
    this.dashboardData$ = combineLatest([
      this.performanceService.performanceMetrics$,
      this.bundleAnalyzer.bundleMetrics$
    ]).pipe(
      map(([performanceMetrics, bundleMetrics]) => 
        this.transformToDashboardData(performanceMetrics, bundleMetrics)
      ),
      takeUntil(this.destroy$)
    );

    // Start initial analysis
    this.performanceService.analyzeBundlePerformance();
    this.bundleAnalyzer.analyzeBundleStructure();
  }

  /**
   * Sets up auto-refresh for real-time updates
   */
  private setupAutoRefresh(): void {
    interval(5000) // Refresh every 5 seconds
      .pipe(
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        if (this.autoRefreshEnabled) {
          this.refreshMetrics();
        }
      });
  }

  // =============================================================================
  // DATA TRANSFORMATION
  // =============================================================================

  /**
   * Transforms performance metrics into dashboard data
   * 
   * @param performanceMetrics - Performance metrics
   * @param bundleMetrics - Bundle analysis metrics
   * @returns Dashboard data
   */
  private transformToDashboardData(
    performanceMetrics: PerformanceMetrics,
    bundleMetrics: BundleAnalysisMetrics
  ): DashboardData {
    const componentMetricsArray = Array.from(performanceMetrics.componentMetrics.values());
    const overallScore = this.calculateOverallScore(performanceMetrics, bundleMetrics);
    const healthStatus = this.determineHealthStatus(overallScore);
    
    // Combine recommendations from both services
    const recommendations = [
      ...this.generatePerformanceRecommendations(performanceMetrics),
      ...bundleMetrics.recommendations
    ];

    return {
      overallScore,
      healthStatus,
      memoryHealth: this.determineMemoryHealth(performanceMetrics.memoryMetrics),
      networkHealth: this.determineNetworkHealth(performanceMetrics.networkMetrics),
      memoryMetrics: performanceMetrics.memoryMetrics,
      networkMetrics: performanceMetrics.networkMetrics,
      webVitals: performanceMetrics.webVitals,
      bundleMetrics,
      componentMetrics: performanceMetrics.componentMetrics,
      componentMetricsArray,
      recommendations,
      timestamp: Date.now()
    };
  }

  /**
   * Calculates overall performance score
   * 
   * @param performanceMetrics - Performance metrics
   * @param bundleMetrics - Bundle metrics
   * @returns Overall score (0-100)
   */
  private calculateOverallScore(
    performanceMetrics: PerformanceMetrics,
    bundleMetrics: BundleAnalysisMetrics
  ): number {
    let score = 100;

    // Memory score (25% weight)
    const memoryScore = this.calculateMemoryScore(performanceMetrics.memoryMetrics);
    score -= (100 - memoryScore) * 0.25;

    // Network score (25% weight)
    const networkScore = this.calculateNetworkScore(performanceMetrics.networkMetrics);
    score -= (100 - networkScore) * 0.25;

    // Web Vitals score (25% weight)
    const vitalsScore = this.calculateWebVitalsScore(performanceMetrics.webVitals);
    score -= (100 - vitalsScore) * 0.25;

    // Bundle score (25% weight)
    const bundleScore = this.calculateBundleScore(bundleMetrics);
    score -= (100 - bundleScore) * 0.25;

    return Math.max(0, Math.round(score));
  }

  /**
   * Calculates memory performance score
   * 
   * @param memoryMetrics - Memory metrics
   * @returns Memory score (0-100)
   */
  private calculateMemoryScore(memoryMetrics: any): number {
    let score = 100;

    switch (memoryMetrics.memoryPressure) {
      case 'critical': score -= 50; break;
      case 'high': score -= 30; break;
      case 'medium': score -= 15; break;
    }

    if (memoryMetrics.leakCount > 0) {
      score -= memoryMetrics.leakCount * 10;
    }

    return Math.max(0, score);
  }

  /**
   * Calculates network performance score
   * 
   * @param networkMetrics - Network metrics
   * @returns Network score (0-100)
   */
  private calculateNetworkScore(networkMetrics: any): number {
    let score = 100;

    // Response time penalty
    if (networkMetrics.averageResponseTime > 1000) score -= 20;
    else if (networkMetrics.averageResponseTime > 500) score -= 10;

    // Failure rate penalty
    const failureRate = networkMetrics.failedRequests / Math.max(networkMetrics.totalRequests, 1);
    score -= failureRate * 40;

    // Cache hit bonus
    if (networkMetrics.cacheHitRate > 0.7) score += 5;

    return Math.max(0, score);
  }

  /**
   * Calculates Web Vitals score
   * 
   * @param webVitals - Web Vitals metrics
   * @returns Web Vitals score (0-100)
   */
  private calculateWebVitalsScore(webVitals: any): number {
    let score = 100;

    // LCP scoring
    if (webVitals.lcp > 4000) score -= 20;
    else if (webVitals.lcp > 2500) score -= 10;

    // FID scoring
    if (webVitals.fid > 300) score -= 20;
    else if (webVitals.fid > 100) score -= 10;

    // CLS scoring
    if (webVitals.cls > 0.25) score -= 20;
    else if (webVitals.cls > 0.1) score -= 10;

    return Math.max(0, score);
  }

  /**
   * Calculates bundle performance score
   * 
   * @param bundleMetrics - Bundle metrics
   * @returns Bundle score (0-100)
   */
  private calculateBundleScore(bundleMetrics: BundleAnalysisMetrics): number {
    let score = 100;

    // Bundle size penalty
    if (bundleMetrics.totalBundleSize > 2048 * 1024) score -= 30; // 2MB
    else if (bundleMetrics.totalBundleSize > 1024 * 1024) score -= 15; // 1MB

    // Lazy loading bonus
    if (bundleMetrics.lazyChunkCount > 0) score += 10;

    // Compression bonus
    if (bundleMetrics.compressionRatio > 0.7) score += 5;

    return Math.max(0, score);
  }

  // =============================================================================
  // STATUS DETERMINATION
  // =============================================================================

  /**
   * Determines overall health status
   * 
   * @param score - Overall score
   * @returns Health status
   */
  private determineHealthStatus(score: number): 'good' | 'warning' | 'critical' {
    if (score >= 80) return 'good';
    if (score >= 60) return 'warning';
    return 'critical';
  }

  /**
   * Determines memory health status
   * 
   * @param memoryMetrics - Memory metrics
   * @returns Memory health status
   */
  private determineMemoryHealth(memoryMetrics: any): 'good' | 'warning' | 'critical' {
    if (memoryMetrics.memoryPressure === 'critical' || memoryMetrics.leakCount > 2) {
      return 'critical';
    }
    if (memoryMetrics.memoryPressure === 'high' || memoryMetrics.leakCount > 0) {
      return 'warning';
    }
    return 'good';
  }

  /**
   * Determines network health status
   * 
   * @param networkMetrics - Network metrics
   * @returns Network health status
   */
  private determineNetworkHealth(networkMetrics: any): 'good' | 'warning' | 'critical' {
    const failureRate = networkMetrics.failedRequests / Math.max(networkMetrics.totalRequests, 1);
    
    if (failureRate > 0.1 || networkMetrics.averageResponseTime > 2000) {
      return 'critical';
    }
    if (failureRate > 0.05 || networkMetrics.averageResponseTime > 1000) {
      return 'warning';
    }
    return 'good';
  }

  // =============================================================================
  // UI HELPERS
  // =============================================================================

  /**
   * Gets Web Vital status CSS class
   * 
   * @param vital - Vital type
   * @param value - Vital value
   * @returns CSS class
   */
  getVitalStatus(vital: string, value: number): string {
    const thresholds = {
      lcp: { good: 2500, poor: 4000 },
      fid: { good: 100, poor: 300 },
      cls: { good: 0.1, poor: 0.25 },
      ttfb: { good: 600, poor: 1500 }
    };

    const threshold = thresholds[vital as keyof typeof thresholds];
    if (!threshold) return 'vital-good';

    if (value <= threshold.good) return 'vital-good';
    if (value <= threshold.poor) return 'vital-needs-improvement';
    return 'vital-poor';
  }

  /**
   * Gets component performance status
   * 
   * @param component - Component profiling data
   * @returns Status CSS class
   */
  getComponentStatus(component: ComponentProfiling): string {
    if (component.averageRenderTime <= 8) return 'status-excellent';
    if (component.averageRenderTime <= 16) return 'status-good';
    return 'status-needs-attention';
  }

  /**
   * Gets component status text
   * 
   * @param component - Component profiling data
   * @returns Status text
   */
  getComponentStatusText(component: ComponentProfiling): string {
    if (component.averageRenderTime <= 8) return 'Excellent';
    if (component.averageRenderTime <= 16) return 'Good';
    return 'Needs Attention';
  }

  /**
   * Formats bytes to human readable format
   * 
   * @param bytes - Bytes to format
   * @returns Formatted string
   */
  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // =============================================================================
  // USER ACTIONS
  // =============================================================================

  /**
   * Refreshes all performance metrics
   */
  refreshMetrics(): void {
    console.log('🔄 Refreshing performance metrics...');
    this.performanceService.analyzeBundlePerformance();
    this.bundleAnalyzer.analyzeBundleStructure();
  }

  /**
   * Toggles auto-refresh functionality
   */
  toggleAutoRefresh(): void {
    this.autoRefreshEnabled = !this.autoRefreshEnabled;
    console.log(`⚡ Auto refresh ${this.autoRefreshEnabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Exports performance report
   */
  exportReport(): void {
    const performanceSummary = this.performanceService.getPerformanceSummary();
    const bundleReport = this.bundleAnalyzer.getOptimizationReport();
    
    const report = {
      timestamp: new Date().toISOString(),
      performance: performanceSummary,
      bundle: bundleReport
    };

    // Create and download report
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `performance-report-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);

    console.log('📊 Performance report exported');
  }

  /**
   * Generates performance recommendations
   * 
   * @param metrics - Performance metrics
   * @returns Array of recommendations
   */
  private generatePerformanceRecommendations(metrics: PerformanceMetrics): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];

    // Add performance-specific recommendations
    if (metrics.memoryMetrics.memoryPressure === 'high' || metrics.memoryMetrics.memoryPressure === 'critical') {
      recommendations.push({
        type: 'bundle_size',
        priority: 'high',
        title: 'Memory pressure detected',
        description: 'High memory usage may cause performance issues',
        impact: 'high',
        effort: 'medium',
        actions: ['Review memory leaks', 'Implement better garbage collection', 'Optimize component lifecycles']
      });
    }

    return recommendations;
  }
}

// =============================================================================
// INTERFACES
// =============================================================================

interface DashboardData {
  overallScore: number;
  healthStatus: 'good' | 'warning' | 'critical';
  memoryHealth: 'good' | 'warning' | 'critical';
  networkHealth: 'good' | 'warning' | 'critical';
  memoryMetrics: any;
  networkMetrics: any;
  webVitals: any;
  bundleMetrics: BundleAnalysisMetrics;
  componentMetrics: Map<string, ComponentProfiling>;
  componentMetricsArray: ComponentProfiling[];
  recommendations: OptimizationRecommendation[];
  timestamp: number;
}