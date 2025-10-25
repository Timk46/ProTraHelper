/**
 * Chart Data Transfer Objects
 *
 * Contains interfaces for chart visualization data structures
 * Used primarily with ngx-charts library
 */

/**
 * Single data point in a chart series
 *
 * @interface ChartDataPointDTO
 */
export interface ChartDataPointDTO {
  name: string;
  value: number;
}

/**
 * Chart series data with multiple data points
 *
 * @interface ChartSeriesDTO
 */
export interface ChartSeriesDTO {
  name: string;
  series: ChartDataPointDTO[];
}

/**
 * Multi-series chart data (for grouped/stacked bar charts)
 *
 * @interface MultiSeriesChartDataDTO
 */
export interface MultiSeriesChartDataDTO {
  name: string;
  series: ChartDataPointDTO[];
}
