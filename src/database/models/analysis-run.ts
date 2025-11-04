/**
 * Analysis run model
 */

import { query, transaction } from '../connection';
import { AssessmentResult } from '../../types';
import { LineageGraph } from '../../types';
import { ImpactAnalysis } from '../../types';
import { TechStack } from '../../types';

export interface AnalysisRun {
  id: string;
  repository_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  started_at: Date;
  completed_at?: Date;
  duration_ms?: number;
  tech_stack?: TechStack;
  error_message?: string;
  created_at: Date;
}

export interface CreateAnalysisRunInput {
  repository_id: string;
  tech_stack?: TechStack;
}

/**
 * Create analysis run
 */
export async function createAnalysisRun(
  input: CreateAnalysisRunInput
): Promise<AnalysisRun> {
  const result = await query<AnalysisRun>(
    `INSERT INTO analysis_runs (repository_id, tech_stack, status)
     VALUES ($1, $2::jsonb, 'running')
     RETURNING *`,
    [input.repository_id, input.tech_stack ? JSON.stringify(input.tech_stack) : null]
  );

  return result.rows[0];
}

/**
 * Update analysis run status
 */
export async function updateAnalysisRunStatus(
  id: string,
  status: AnalysisRun['status'],
  errorMessage?: string
): Promise<void> {
  const startedAt = await query<{ started_at: Date }>(
    'SELECT started_at FROM analysis_runs WHERE id = $1',
    [id]
  );

  const duration =
    status === 'completed' || status === 'failed'
      ? Date.now() - new Date(startedAt.rows[0].started_at).getTime()
      : null;

  await query(
    `UPDATE analysis_runs 
     SET status = $1, 
         completed_at = CASE WHEN $1 IN ('completed', 'failed') THEN CURRENT_TIMESTAMP ELSE completed_at END,
         duration_ms = $2,
         error_message = $3
     WHERE id = $4`,
    [status, duration, errorMessage || null, id]
  );
}

/**
 * Save assessment results
 */
export async function saveAssessmentResults(
  analysisRunId: string,
  assessment: AssessmentResult
): Promise<void> {
  await transaction(async (client) => {
    // Save security assessment
    await client.query(
      `INSERT INTO assessment_results 
       (analysis_run_id, type, score, issues_count, critical_count, high_count, medium_count, low_count, details)
       VALUES ($1, 'security', $2, $3, $4, $5, $6, $7, $8::jsonb)`,
      [
        analysisRunId,
        assessment.summary.securityScore,
        assessment.security.issues.length,
        assessment.summary.criticalIssues,
        assessment.summary.highIssues,
        assessment.summary.mediumIssues,
        assessment.summary.lowIssues,
        JSON.stringify(assessment.security),
      ]
    );

    // Save quality assessment
    await client.query(
      `INSERT INTO assessment_results 
       (analysis_run_id, type, score, issues_count, details)
       VALUES ($1, 'quality', $2, $3, $4::jsonb)`,
      [
        analysisRunId,
        assessment.summary.qualityScore,
        assessment.quality.issues.length,
        JSON.stringify(assessment.quality),
      ]
    );

    // Save architecture assessment
    await client.query(
      `INSERT INTO assessment_results 
       (analysis_run_id, type, score, issues_count, details)
       VALUES ($1, 'architecture', $2, $3, $4::jsonb)`,
      [
        analysisRunId,
        assessment.summary.architectureScore,
        assessment.architecture.issues.length,
        JSON.stringify(assessment.architecture),
      ]
    );
  });
}

/**
 * Save lineage graph
 */
export async function saveLineageGraph(
  analysisRunId: string,
  graph: LineageGraph
): Promise<void> {
  await query(
    `INSERT INTO lineage_graphs 
     (analysis_run_id, graph_data, node_count, edge_count, frontend_nodes, backend_nodes, database_nodes, average_confidence)
     VALUES ($1, $2::jsonb, $3, $4, $5, $6, $7, $8)`,
    [
      analysisRunId,
      JSON.stringify(graph),
      graph.nodes.length,
      graph.edges.length,
      graph.layers.frontend.length,
      graph.layers.backend.length,
      graph.layers.database.length,
      graph.metadata.confidence.average,
    ]
  );
}

/**
 * Save impact analysis
 */
export async function saveImpactAnalysis(
  analysisRunId: string,
  impact: ImpactAnalysis
): Promise<void> {
  await query(
    `INSERT INTO impact_analyses 
     (analysis_run_id, change_request, change_type, affected_files_count, affected_nodes_count, breaking_changes_count, complexity, impact_data)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)`,
    [
      analysisRunId,
      impact.changeRequest.description,
      impact.changeRequest.type,
      impact.affectedFiles.length,
      impact.affectedNodes.length,
      impact.breakingChanges.length,
      impact.summary.estimatedComplexity,
      JSON.stringify(impact),
    ]
  );
}

/**
 * Get analysis run by ID
 */
export async function getAnalysisRun(id: string): Promise<AnalysisRun | null> {
  const result = await query<AnalysisRun>(
    'SELECT * FROM analysis_runs WHERE id = $1',
    [id]
  );

  return result.rows[0] || null;
}

/**
 * Get latest analysis run for repository
 */
export async function getLatestAnalysisRun(
  repositoryId: string
): Promise<AnalysisRun | null> {
  const result = await query<AnalysisRun>(
    `SELECT * FROM analysis_runs 
     WHERE repository_id = $1 
     ORDER BY started_at DESC 
     LIMIT 1`,
    [repositoryId]
  );

  return result.rows[0] || null;
}

