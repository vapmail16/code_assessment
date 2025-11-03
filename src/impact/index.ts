/**
 * Impact analysis module
 */

export * from './change-parser';
export * from './analyzer';
export { parseChangeRequest, extractChangeDetails } from './change-parser';
export { analyzeChangeImpact } from './analyzer';
export type { ImpactAnalysisContext } from './analyzer';

