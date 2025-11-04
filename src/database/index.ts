/**
 * Database module exports
 */

export * from './connection';
export * from './models';
export * from './analysis-repository';
export * from './migrations';

export {
  initializeDatabase,
  getDatabase,
  query,
  transaction,
  testConnection,
  closeDatabase,
} from './connection';

export {
  saveAnalysisResult,
  getAnalysisResult,
  getAnalysisResultsByRepository,
  saveImpactAnalysis,
  getImpactAnalysesByAnalysisId,
  saveValidationResult,
  saveBenchmarkResult,
  getRecentBenchmarks,
  cacheParsedFile,
  getCachedParsedFile,
  cleanExpiredCache,
} from './analysis-repository';

export { runMigrations, isDatabaseInitialized } from './migrations';
