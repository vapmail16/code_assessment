/**
 * Persistence service for analysis results
 */

import {
  createAnalysisResult,
  getAnalysisResultByRepository,
  updateAnalysisResult,
  createImpactAnalysis,
} from '../database';
import { AssessmentResult } from '../types';
import { LineageGraph } from '../types';
import { TechStack } from '../types';
import { ImpactAnalysis, ChangeRequest } from '../types';
import { logger } from '../utils/logger';
import { loadConfig } from '../config';

export interface SaveAnalysisOptions {
  repository: string;
  repositoryUrl?: string;
  techStack?: TechStack;
  assessmentResult?: AssessmentResult;
  lineageGraph?: LineageGraph;
}

/**
 * Save analysis result to database
 */
export async function saveAnalysisResult(
  options: SaveAnalysisOptions
): Promise<number | null> {
  const config = loadConfig();

  if (!config.database.enabled) {
    logger.debug('Database persistence disabled, skipping save');
    return null;
  }

  try {
    // Check if result already exists
    const existing = await getAnalysisResultByRepository(options.repository);

    if (existing) {
      // Update existing result
      const updated = await updateAnalysisResult(existing.id, {
        repository: options.repository,
        repositoryUrl: options.repositoryUrl,
        techStack: options.techStack,
        assessmentResult: options.assessmentResult,
        lineageGraph: options.lineageGraph,
        status: 'completed',
      });

      logger.info('Analysis result updated', {
        id: updated?.id,
        repository: options.repository,
      });

      return updated?.id || null;
    } else {
      // Create new result
      const created = await createAnalysisResult({
        repository: options.repository,
        repositoryUrl: options.repositoryUrl,
        techStack: options.techStack,
        assessmentResult: options.assessmentResult,
        lineageGraph: options.lineageGraph,
        status: 'completed',
      });

      logger.info('Analysis result saved', {
        id: created.id,
        repository: options.repository,
      });

      return created.id;
    }
  } catch (error: any) {
    logger.error('Failed to save analysis result', {
      repository: options.repository,
      error: error.message,
    });
    return null;
  }
}

/**
 * Save impact analysis to database
 */
export async function saveImpactAnalysis(
  analysisResultId: number,
  changeRequest: ChangeRequest,
  impactResult: ImpactAnalysis
): Promise<number | null> {
  const config = loadConfig();

  if (!config.database.enabled) {
    logger.debug('Database persistence disabled, skipping save');
    return null;
  }

  try {
    const created = await createImpactAnalysis({
      analysisResultId,
      changeRequest,
      impactResult,
    });

    logger.info('Impact analysis saved', {
      id: created.id,
      analysisResultId,
    });

    return created.id;
  } catch (error: any) {
    logger.error('Failed to save impact analysis', {
      analysisResultId,
      error: error.message,
    });
    return null;
  }
}

/**
 * Save error result to database
 */
export async function saveAnalysisError(
  repository: string,
  errorMessage: string,
  repositoryUrl?: string
): Promise<number | null> {
  const config = loadConfig();

  if (!config.database.enabled) {
    return null;
  }

  try {
    const existing = await getAnalysisResultByRepository(repository);

    if (existing) {
      await updateAnalysisResult(existing.id, {
        status: 'failed',
        errorMessage,
      });
      return existing.id;
    } else {
      const created = await createAnalysisResult({
        repository,
        repositoryUrl,
        status: 'failed',
        errorMessage,
      });
      return created.id;
    }
  } catch (error: any) {
    logger.error('Failed to save error result', {
      repository,
      error: error.message,
    });
    return null;
  }
}

