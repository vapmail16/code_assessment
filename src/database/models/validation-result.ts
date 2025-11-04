/**
 * Validation result model
 */

export interface ValidationResultRow {
  id: number;
  test_case_id: string;
  repository: string;
  metrics: {
    lineage?: {
      overall: number;
      frontendToBackend: number;
      backendToDatabase: number;
    };
    impact?: {
      precision: number;
      recall: number;
      f1Score: number;
    };
  };
  success: boolean;
  errors: string[];
  created_at: Date;
}

export interface CreateValidationResultInput {
  testCaseId: string;
  repository: string;
  metrics: ValidationResultRow['metrics'];
  success: boolean;
  errors?: string[];
}

/**
 * Create a new validation result
 */
export async function createValidationResult(
  input: CreateValidationResultInput
): Promise<ValidationResultRow> {
  const { query } = await import('../connection');
  
  const result = await query<ValidationResultRow>(
    `
      INSERT INTO validation_results (
        test_case_id, repository, metrics, success, errors
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `,
    [
      input.testCaseId,
      input.repository,
      JSON.stringify(input.metrics),
      input.success,
      input.errors || [],
    ]
  );

  return parseValidationResultRow(result.rows[0]);
}

/**
 * Get validation results by test case
 */
export async function getValidationResultsByTestCase(
  testCaseId: string
): Promise<ValidationResultRow[]> {
  const { query } = await import('../connection');
  
  const result = await query<ValidationResultRow>(
    'SELECT * FROM validation_results WHERE test_case_id = $1 ORDER BY created_at DESC',
    [testCaseId]
  );

  return result.rows.map(parseValidationResultRow);
}

/**
 * Get validation results by repository
 */
export async function getValidationResultsByRepository(
  repository: string
): Promise<ValidationResultRow[]> {
  const { query } = await import('../connection');
  
  const result = await query<ValidationResultRow>(
    'SELECT * FROM validation_results WHERE repository = $1 ORDER BY created_at DESC',
    [repository]
  );

  return result.rows.map(parseValidationResultRow);
}

/**
 * Parse validation result row
 */
function parseValidationResultRow(row: any): ValidationResultRow {
  return {
    id: row.id,
    test_case_id: row.test_case_id,
    repository: row.repository,
    metrics: JSON.parse(JSON.stringify(row.metrics)),
    success: row.success,
    errors: row.errors || [],
    created_at: row.created_at,
  };
}

