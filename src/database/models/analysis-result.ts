/**
 * Analysis result model
 */

import { query } from '../connection';
import { AssessmentResult } from '../../types';
import { LineageGraph } from '../../types';
import { TechStack } from '../../types';

export interface AnalysisResultRow {
  id: number;
  repository: string;
  repository_url: string | null;
  tech_stack: TechStack | null;
  assessment_result: AssessmentResult | null;
  lineage_graph: LineageGraph | null;
  created_at: Date;
  updated_at: Date;
  status: string;
  error_message: string | null;
}

export interface CreateAnalysisResultInput {
  repository: string;
  repositoryUrl?: string;
  techStack?: TechStack;
  assessmentResult?: AssessmentResult;
  lineageGraph?: LineageGraph;
  status?: string;
  errorMessage?: string;
}

/**
 * Create a new analysis result
 */
export async function createAnalysisResult(
  input: CreateAnalysisResultInput
): Promise<AnalysisResultRow> {
  const result = await query<AnalysisResultRow>(
    `
      INSERT INTO analysis_results (
        repository, repository_url, tech_stack, assessment_result,
        lineage_graph, status, error_message
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `,
    [
      input.repository,
      input.repositoryUrl || null,
      input.techStack ? JSON.stringify(input.techStack) : null,
      input.assessmentResult ? JSON.stringify(input.assessmentResult) : null,
      input.lineageGraph ? JSON.stringify(input.lineageGraph) : null,
      input.status || 'completed',
      input.errorMessage || null,
    ]
  );

  return parseAnalysisResultRow(result.rows[0]);
}

/**
 * Get analysis result by ID
 */
export async function getAnalysisResultById(id: number): Promise<AnalysisResultRow | null> {
  const result = await query<AnalysisResultRow>(
    'SELECT * FROM analysis_results WHERE id = $1',
    [id]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return parseAnalysisResultRow(result.rows[0]);
}

/**
 * Get analysis result by repository
 */
export async function getAnalysisResultByRepository(
  repository: string
): Promise<AnalysisResultRow | null> {
  const result = await query<AnalysisResultRow>(
    'SELECT * FROM analysis_results WHERE repository = $1 ORDER BY created_at DESC LIMIT 1',
    [repository]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return parseAnalysisResultRow(result.rows[0]);
}

/**
 * List analysis results
 */
export async function listAnalysisResults(options?: {
  limit?: number;
  offset?: number;
  repository?: string;
  status?: string;
}): Promise<AnalysisResultRow[]> {
  let sql = 'SELECT * FROM analysis_results WHERE 1=1';
  const params: any[] = [];
  let paramCount = 0;

  if (options?.repository) {
    paramCount++;
    sql += ` AND repository = $${paramCount}`;
    params.push(options.repository);
  }

  if (options?.status) {
    paramCount++;
    sql += ` AND status = $${paramCount}`;
    params.push(options.status);
  }

  sql += ' ORDER BY created_at DESC';

  if (options?.limit) {
    paramCount++;
    sql += ` LIMIT $${paramCount}`;
    params.push(options.limit);
  }

  if (options?.offset) {
    paramCount++;
    sql += ` OFFSET $${paramCount}`;
    params.push(options.offset);
  }

  const result = await query<AnalysisResultRow>(sql, params);
  return result.rows.map(parseAnalysisResultRow);
}

/**
 * Update analysis result
 */
export async function updateAnalysisResult(
  id: number,
  updates: Partial<CreateAnalysisResultInput>
): Promise<AnalysisResultRow | null> {
  const updatesList: string[] = [];
  const params: any[] = [];
  let paramCount = 0;

  if (updates.repository !== undefined) {
    paramCount++;
    updatesList.push(`repository = $${paramCount}`);
    params.push(updates.repository);
  }

  if (updates.repositoryUrl !== undefined) {
    paramCount++;
    updatesList.push(`repository_url = $${paramCount}`);
    params.push(updates.repositoryUrl);
  }

  if (updates.techStack !== undefined) {
    paramCount++;
    updatesList.push(`tech_stack = $${paramCount}`);
    params.push(JSON.stringify(updates.techStack));
  }

  if (updates.assessmentResult !== undefined) {
    paramCount++;
    updatesList.push(`assessment_result = $${paramCount}`);
    params.push(JSON.stringify(updates.assessmentResult));
  }

  if (updates.lineageGraph !== undefined) {
    paramCount++;
    updatesList.push(`lineage_graph = $${paramCount}`);
    params.push(JSON.stringify(updates.lineageGraph));
  }

  if (updates.status !== undefined) {
    paramCount++;
    updatesList.push(`status = $${paramCount}`);
    params.push(updates.status);
  }

  if (updates.errorMessage !== undefined) {
    paramCount++;
    updatesList.push(`error_message = $${paramCount}`);
    params.push(updates.errorMessage);
  }

  if (updatesList.length === 0) {
    return getAnalysisResultById(id);
  }

  paramCount++;
  updatesList.push(`updated_at = CURRENT_TIMESTAMP`);
  paramCount++;
  updatesList.push(`id = $${paramCount}`);
  params.push(id);

  const result = await query<AnalysisResultRow>(
    `UPDATE analysis_results SET ${updatesList.join(', ')} WHERE id = $${paramCount} RETURNING *`,
    params
  );

  if (result.rows.length === 0) {
    return null;
  }

  return parseAnalysisResultRow(result.rows[0]);
}

/**
 * Delete analysis result
 */
export async function deleteAnalysisResult(id: number): Promise<boolean> {
  const result = await query('DELETE FROM analysis_results WHERE id = $1', [id]);
  return result.rowCount !== null && result.rowCount > 0;
}

/**
 * Parse analysis result row (convert JSONB fields)
 */
function parseAnalysisResultRow(row: any): AnalysisResultRow {
  return {
    id: row.id,
    repository: row.repository,
    repository_url: row.repository_url,
    tech_stack: row.tech_stack ? JSON.parse(JSON.stringify(row.tech_stack)) : null,
    assessment_result: row.assessment_result ? JSON.parse(JSON.stringify(row.assessment_result)) : null,
    lineage_graph: row.lineage_graph ? JSON.parse(JSON.stringify(row.lineage_graph)) : null,
    created_at: row.created_at,
    updated_at: row.updated_at,
    status: row.status,
    error_message: row.error_message,
  };
}

