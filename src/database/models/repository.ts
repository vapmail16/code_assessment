/**
 * Repository model
 */

import { query } from '../connection';

export interface Repository {
  id: string;
  github_id: string;
  name: string;
  owner: string;
  full_name: string;
  url?: string;
  description?: string;
  language?: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreateRepositoryInput {
  github_id: string;
  name: string;
  owner: string;
  full_name: string;
  url?: string;
  description?: string;
  language?: string;
}

/**
 * Create or update repository
 */
export async function upsertRepository(
  input: CreateRepositoryInput
): Promise<Repository> {
  const result = await query<Repository>(
    `INSERT INTO repositories (github_id, name, owner, full_name, url, description, language)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (github_id) 
     DO UPDATE SET 
       name = EXCLUDED.name,
       owner = EXCLUDED.owner,
       full_name = EXCLUDED.full_name,
       url = EXCLUDED.url,
       description = EXCLUDED.description,
       language = EXCLUDED.language,
       updated_at = CURRENT_TIMESTAMP
     RETURNING *`,
    [
      input.github_id,
      input.name,
      input.owner,
      input.full_name,
      input.url,
      input.description,
      input.language,
    ]
  );

  return result.rows[0];
}

/**
 * Get repository by GitHub ID
 */
export async function getRepositoryByGitHubId(
  githubId: string
): Promise<Repository | null> {
  const result = await query<Repository>(
    'SELECT * FROM repositories WHERE github_id = $1',
    [githubId]
  );

  return result.rows[0] || null;
}

/**
 * Get repository by ID
 */
export async function getRepositoryById(id: string): Promise<Repository | null> {
  const result = await query<Repository>(
    'SELECT * FROM repositories WHERE id = $1',
    [id]
  );

  return result.rows[0] || null;
}

