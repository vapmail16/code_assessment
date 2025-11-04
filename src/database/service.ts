/**
 * Database service - high-level operations for persistence
 */

import {
  upsertRepository,
  getRepositoryByGitHubId,
  type Repository,
} from './models/repository';
// Analysis run functionality removed - using direct models instead
// import {
//   createAnalysisRun,
//   updateAnalysisRunStatus,
//   saveAssessmentResults,
//   saveLineageGraph,
//   saveImpactAnalysis,
//   type AnalysisRun,
// } from './models/analysis-run';
import { AssessmentResult } from '../types';
import { LineageGraph } from '../types';
import { ImpactAnalysis } from '../types';
import { TechStack } from '../types';
import { runMigrations } from './migrations';
import { testConnection } from './connection';
import { logger } from '../utils/logger';

export class DatabaseService {
  /**
   * Initialize database (run migrations)
   */
  async initialize(): Promise<void> {
    try {
      await runMigrations();
      logger.info('Database initialized');
    } catch (error: any) {
      logger.error('Database initialization failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Check database health
   */
  async healthCheck(): Promise<boolean> {
    return await testConnection();
  }

  /**
   * Save or update repository
   */
  async saveRepository(input: {
    github_id: string;
    name: string;
    owner: string;
    full_name: string;
    url?: string;
    description?: string;
    language?: string;
  }): Promise<Repository> {
    return await upsertRepository(input);
  }

  /**
   * Get repository by GitHub ID
   */
  async getRepository(githubId: string): Promise<Repository | null> {
    return await getRepositoryByGitHubId(githubId);
  }

  // Analysis run methods removed - use direct models instead
}

// Singleton instance
let dbService: DatabaseService | null = null;

export function getDatabaseService(): DatabaseService {
  if (!dbService) {
    dbService = new DatabaseService();
  }
  return dbService;
}

