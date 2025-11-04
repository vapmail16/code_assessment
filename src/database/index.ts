/**
 * Database module
 */

export * from './connection';
export * from './models/analysis-result';
export * from './models/impact-analysis';
export * from './models/validation-result';

export {
  initializeDatabase,
  getDatabasePool,
  query,
  testConnection,
  closeDatabase,
  runMigrations,
} from './connection';

export {
  createAnalysisResult,
  getAnalysisResultById,
  getAnalysisResultByRepository,
  listAnalysisResults,
  updateAnalysisResult,
  deleteAnalysisResult,
} from './models/analysis-result';

export {
  createImpactAnalysis,
  getImpactAnalysesByAnalysisResultId,
  getImpactAnalysisById,
} from './models/impact-analysis';

export {
  createValidationResult,
  getValidationResultsByTestCase,
  getValidationResultsByRepository,
} from './models/validation-result';
