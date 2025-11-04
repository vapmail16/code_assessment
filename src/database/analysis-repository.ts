/**
 * Repository for analysis results persistence
 */

import { query, transaction } from './connection';
import {
  AnalysisResultRow,
  ImpactAnalysisRow,
  ValidationResultRow,
  PerformanceBenchmarkRow,
  ParsedFileCacheRow,
} from './models';
import { AssessmentResult } from '../types';
import { ImpactAnalysis } from '../types';
import { LineageGraph } from '../types';
import { BenchmarkResult } from '../performance/benchmarks';
import { logger } from '../utils/logger';

/**
 * Save analysis result to database
 */
export async function saveAnalysisResult(
  repository: string,
  repositoryUrl: string | undefined,
  assessment: AssessmentResult,
  lineageGraph: LineageGraph | undefined,
  techStack: any,
  durationMs?: number
): Promise<string> {
  const result = await query<AnalysisResultRow>(
    `INSERT INTO analysis_results (
      repository, repository_url, tech_stack, assessment, lineage_graph,
      analysis_duration_ms, status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id`,
    [
      repository,
      repositoryUrl || null,
      JSON.stringify(techStack),
      JSON.stringify(assessment),
      lineageGraph ? JSON.stringify(lineageGraph) : null,
      durationMs || null,
      'completed',
    ]
  );

  const id = result.rows[0].id;
  logger.info('Analysis result saved', { id, repository });
  return id;
}

/**
 * Get analysis result by ID
 */
export async function getAnalysisResult(id: string): Promise<AnalysisResultRow | null> {
  const result = await query<AnalysisResultRow>(
    'SELECT * FROM analysis_results WHERE id = $1',
    [id]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
}

/**
 * Get analysis results for a repository
 */
export async function getAnalysisResultsByRepository(
  repository: string,
  limit: number = 10
): Promise<AnalysisResultRow[]> {
  const result = await query<AnalysisResultRow>(
    `SELECT * FROM analysis_results 
     WHERE repository = $1 
     ORDER BY created_at DESC 
     LIMIT $2`,
    [repository, limit]
  );

  return result.rows;
}

/**
 * Save impact analysis result
 */
export async function saveImpactAnalysis(
  analysisResultId: string,
  changeRequest: any,
  impactAnalysis: ImpactAnalysis
): Promise<string> {
  const result = await query<ImpactAnalysisRow>(
    `INSERT INTO impact_analyses (
      analysis_result_id, change_request, impact_analysis,
      affected_files, breaking_changes_count
    ) VALUES ($1, $2, $3, $4, $5)
    RETURNING id`,
    [
      analysisResultId,
      JSON.stringify(changeRequest),
      JSON.stringify(impactAnalysis),
      impactAnalysis.affectedFiles || [],
      impactAnalysis.breakingChanges?.length || 0,
    ]
  );

  const id = result.rows[0].id;
  logger.info('Impact analysis saved', { id, analysisResultId });
  return id;
}

/**
 * Get impact analyses for an analysis result
 */
export async function getImpactAnalysesByAnalysisId(
  analysisResultId: string
): Promise<ImpactAnalysisRow[]> {
  const result = await query<ImpactAnalysisRow>(
    `SELECT * FROM impact_analyses 
     WHERE analysis_result_id = $1 
     ORDER BY created_at DESC`,
    [analysisResultId]
  );

  return result.rows;
}

/**
 * Save validation test result
 */
export async function saveValidationResult(
  testCaseId: string,
  repository: string,
  lineageAccuracy?: number,
  impactMetrics?: { precision: number; recall: number; f1Score: number },
  success: boolean = false,
  errors?: string[]
): Promise<string> {
  const result = await query<ValidationResultRow>(
    `INSERT INTO validation_results (
      test_case_id, repository, lineage_accuracy,
      impact_precision, impact_recall, impact_f1_score,
      success, errors
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING id`,
    [
      testCaseId,
      repository,
      lineageAccuracy || null,
      impactMetrics?.precision || null,
      impactMetrics?.recall || null,
      impactMetrics?.f1Score || null,
      success,
      errors || null,
    ]
  );

  const id = result.rows[0].id;
  logger.info('Validation result saved', { id, testCaseId, repository });
  return id;
}

/**
 * Save performance benchmark result
 */
export async function saveBenchmarkResult(benchmark: BenchmarkResult): Promise<string> {
  const result = await query<PerformanceBenchmarkRow>(
    `INSERT INTO performance_benchmarks (
      repository, files_count, lines_of_code, repository_size_mb,
      cloning_time_ms, file_analysis_time_ms, tech_stack_detection_time_ms,
      parsing_time_ms, graph_building_time_ms, assessment_time_ms,
      total_time_ms, peak_memory_mb, average_memory_mb,
      success, errors
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    RETURNING id`,
    [
      benchmark.repository,
      benchmark.size.files,
      benchmark.size.linesOfCode,
      benchmark.size.sizeMB,
      benchmark.timings.cloning,
      benchmark.timings.fileAnalysis,
      benchmark.timings.techStackDetection,
      benchmark.timings.parsing,
      benchmark.timings.graphBuilding,
      benchmark.timings.assessment,
      benchmark.timings.total,
      benchmark.memory.peakHeapMB,
      benchmark.memory.averageHeapMB,
      benchmark.success,
      benchmark.errors || null,
    ]
  );

  const id = result.rows[0].id;
  logger.info('Benchmark result saved', { id, repository: benchmark.repository });
  return id;
}

/**
 * Get recent benchmark results
 */
export async function getRecentBenchmarks(limit: number = 10): Promise<PerformanceBenchmarkRow[]> {
  const result = await query<PerformanceBenchmarkRow>(
    `SELECT * FROM performance_benchmarks 
     ORDER BY created_at DESC 
     LIMIT $1`,
    [limit]
  );

  return result.rows;
}

/**
 * Cache parsed file data
 */
export async function cacheParsedFile(
  repository: string,
  filePath: string,
  fileHash: string,
  parsedData: any,
  ttlSeconds: number = 3600
): Promise<void> {
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

  await query(
    `INSERT INTO parsed_file_cache (
      repository, file_path, file_hash, parsed_data, expires_at
    ) VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (repository, file_path) 
    DO UPDATE SET 
      file_hash = EXCLUDED.file_hash,
      parsed_data = EXCLUDED.parsed_data,
      expires_at = EXCLUDED.expires_at`,
    [repository, filePath, fileHash, JSON.stringify(parsedData), expiresAt]
  );
}

/**
 * Get cached parsed file data
 */
export async function getCachedParsedFile(
  repository: string,
  filePath: string,
  fileHash: string
): Promise<any | null> {
  const result = await query<ParsedFileCacheRow>(
    `SELECT parsed_data FROM parsed_file_cache 
     WHERE repository = $1 
       AND file_path = $2 
       AND file_hash = $3 
       AND (expires_at IS NULL OR expires_at > NOW())`,
    [repository, filePath, fileHash]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0].parsed_data;
}

/**
 * Clean expired cache entries
 */
export async function cleanExpiredCache(): Promise<number> {
  const result = await query(
    'DELETE FROM parsed_file_cache WHERE expires_at < NOW()'
  );

  const deleted = result.rowCount || 0;
  logger.info('Expired cache entries cleaned', { deleted });
  return deleted;
}

