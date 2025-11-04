/**
 * Impact analysis model
 */

import { query } from '../connection';
import { ImpactAnalysis, ChangeRequest } from '../../types';

export interface ImpactAnalysisRow {
  id: number;
  analysis_result_id: number;
  change_request: ChangeRequest;
  impact_result: ImpactAnalysis;
  created_at: Date;
}

export interface CreateImpactAnalysisInput {
  analysisResultId: number;
  changeRequest: ChangeRequest;
  impactResult: ImpactAnalysis;
}

/**
 * Create a new impact analysis
 */
export async function createImpactAnalysis(
  input: CreateImpactAnalysisInput
): Promise<ImpactAnalysisRow> {
  const result = await query<ImpactAnalysisRow>(
    `
      INSERT INTO impact_analyses (
        analysis_result_id, change_request, impact_result
      )
      VALUES ($1, $2, $3)
      RETURNING *
    `,
    [
      input.analysisResultId,
      JSON.stringify(input.changeRequest),
      JSON.stringify(input.impactResult),
    ]
  );

  return parseImpactAnalysisRow(result.rows[0]);
}

/**
 * Get impact analyses for an analysis result
 */
export async function getImpactAnalysesByAnalysisResultId(
  analysisResultId: number
): Promise<ImpactAnalysisRow[]> {
  const result = await query<ImpactAnalysisRow>(
    'SELECT * FROM impact_analyses WHERE analysis_result_id = $1 ORDER BY created_at DESC',
    [analysisResultId]
  );

  return result.rows.map(parseImpactAnalysisRow);
}

/**
 * Get impact analysis by ID
 */
export async function getImpactAnalysisById(id: number): Promise<ImpactAnalysisRow | null> {
  const result = await query<ImpactAnalysisRow>(
    'SELECT * FROM impact_analyses WHERE id = $1',
    [id]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return parseImpactAnalysisRow(result.rows[0]);
}

/**
 * Parse impact analysis row
 */
function parseImpactAnalysisRow(row: any): ImpactAnalysisRow {
  return {
    id: row.id,
    analysis_result_id: row.analysis_result_id,
    change_request: JSON.parse(JSON.stringify(row.change_request)),
    impact_result: JSON.parse(JSON.stringify(row.impact_result)),
    created_at: row.created_at,
  };
}

