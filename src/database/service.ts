/**
 * Database service - high-level operations for persistence
 */

import {
  upsertRepository,
  getRepositoryByGitHubId,
  type Repository,
} from './models/repository';
import {
  createAnalysisRun,
  updateAnalysisRunStatus,
  saveAssessmentResults,
  saveLineageGraph,
  saveImpactAnalysis,
  type AnalysisRun,
} from './models/analysis-run';
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

  /**
   * Start analysis run
   */
  async startAnalysisRun(
    repositoryId: string,
    techStack?: TechStack
  ): Promise<AnalysisRun> {
    return await createAnalysisRun({ repository_id: repositoryId, tech_stack: techStack });
  }

  /**
   * Complete analysis run and save results
   */
  async completeAnalysisRun(
    analysisRunId: string,
    results: {
      assessment?: AssessmentResult;
      lineageGraph?: LineageGraph;
      impactAnalysis?: ImpactAnalysis;
    }
  ): Promise<void> {
    try {
      // Save assessment results
      if (results.assessment) {
        await saveAssessmentResults(analysisRunId, results.assessment);
      }

      // Save lineage graph
      if (results.lineageGraph) {
        await saveLineageGraph(analysisRunId, results.lineageGraph);
      }

      // Save impact analysis
      if (results.impactAnalysis) {
        await saveImpactAnalysis(analysisRunId, results.impactAnalysis);
      }

      // Mark as completed
      await updateAnalysisRunStatus(analysisRunId, 'completed');
    } catch (error: any) {
      await updateAnalysisRunStatus(analysisRunId, 'failed', error.message);
      throw error;
    }
  }

  /**
   * Fail analysis run
   */
  async failAnalysisRun(analysisRunId: string, error: Error): Promise<void> {
    await updateAnalysisRunStatus(analysisRunId, 'failed', error.message);
  }
}

// Singleton instance
let dbService: DatabaseService | null = null;

export function getDatabaseService(): DatabaseService {
  if (!dbService) {
    dbService = new DatabaseService();
  }
  return dbService;
}

