/**
 * Performance-related types
 */

export interface PerformanceMetrics {
  analysisTime: number; // milliseconds
  memoryUsage: {
    peak: number; // MB
    average: number; // MB
  };
  fileProcessing: {
    filesPerSecond: number;
    averageTimePerFile: number; // milliseconds
  };
}

