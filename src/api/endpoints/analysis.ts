/**
 * Analysis API endpoints with database persistence
 */

import { Request, Response } from 'express';
import { GitHubService } from '../../github/service';
import { TechStackDetector } from '../../detection';
import { runAssessment } from '../../assessment/engine';
import { buildLineageGraph } from '../../lineage/graph-builder';
import { saveAnalysisResult } from '../../services/persistence';
import { logger } from '../../utils/logger';
import { formatError } from '../../utils/errors';

/**
 * Analyze repository and save to database
 */
export async function analyzeRepositoryEndpoint(
  req: Request,
  res: Response
): Promise<void> {
  const startTime = Date.now();

  try {
    const { repository, options = {} } = req.body;

    if (!repository) {
      res.status(400).json({ error: 'Repository required' });
      return;
    }

    logger.info('Starting repository analysis', { repository });

    // Clone and analyze
    const githubService = new GitHubService();
    const analysis = await githubService.cloneAndAnalyzeRepository(repository);

    // Detect tech stack
    const detector = new TechStackDetector();
    const techStack = detector.detectTechStack({
      fileTree: analysis.fileTree,
      configFiles: analysis.configFiles,
      entryPoints: analysis.entryPoints,
    });

    // Run assessment
    const assessmentContext = {
      repoPath: analysis.localPath,
      fileTree: analysis.fileTree,
      parsedFiles: [],
      dependencyGraph: undefined,
      lineageGraph: undefined,
    };

    const assessment = await runAssessment(assessmentContext, {
      useExternalScanners: options.includeSecurity !== false,
    });

    // Build lineage graph (if requested)
    let lineageGraph;
    if (options.buildLineage !== false) {
      const graphContext = {
        components: [],
        apiCalls: [],
        endpoints: [],
        queries: [],
        tables: [],
      };
      lineageGraph = buildLineageGraph(graphContext);
    }

    const durationMs = Date.now() - startTime;

    // Save to database
    let analysisId: string | undefined;
    try {
      analysisId = await saveAnalysisResult(
        repository,
        `https://github.com/${repository}`,
        assessment,
        lineageGraph,
        techStack,
        durationMs
      );
      logger.info('Analysis result saved to database', { analysisId, repository });
    } catch (dbError: any) {
      logger.warn('Failed to save analysis to database', {
        error: dbError.message,
        repository,
      });
      // Continue without database save
    }

    res.json({
      success: true,
      id: analysisId,
      repository,
      techStack,
      assessment,
      lineage: lineageGraph
        ? {
            nodes: lineageGraph.nodes.length,
            edges: lineageGraph.edges.length,
          }
        : undefined,
      duration: durationMs,
    });
  } catch (error: any) {
    logger.error('Analysis failed', { error: error.message, stack: error.stack });
    const formattedError = formatError(error);
    res.status(formattedError.statusCode).json({
      error: formattedError.message,
      code: formattedError.code,
    });
  }
}

