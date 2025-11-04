/**
 * Assessment-only command implementation
 */

import { GitHubService } from '../../github/service';
import { runAssessment, AssessmentContext } from '../../assessment/engine';
import { createProgress } from '../../utils/progress';
import { logger } from '../../utils/logger';
import { saveAnalysisResult, saveAnalysisError } from '../../services/persistence';
import { TechStackDetector } from '../../detection';
import { buildLineageGraph } from '../../lineage/graph-builder';
import * as fs from 'fs';
import * as path from 'path';

export async function runAssessCommand(
  repoId: string,
  outputPath: string,
  token?: string
): Promise<void> {
  const progress = createProgress(4);

  try {
    const githubService = new GitHubService(token ? { token } : undefined);

    // Clone and analyze
    progress.increment();
    logger.info('Cloning repository', { repo: repoId });
    const analysis = await githubService.cloneAndAnalyzeRepository(repoId);

    // Run assessment
    progress.increment();
    logger.info('Running code assessment', { files: analysis.fileTree.files.size });
    const assessmentContext: AssessmentContext = {
      repoPath: analysis.localPath,
      fileTree: analysis.fileTree,
      parsedFiles: [], // Would parse files here in full implementation
      dependencyGraph: undefined,
      lineageGraph: undefined,
    };

    // Detect tech stack
    progress.increment();
    const detector = new TechStackDetector();
    const techStack = detector.detectTechStack({
      fileTree: analysis.fileTree,
      configFiles: analysis.configFiles,
      entryPoints: analysis.entryPoints,
    });

    const assessment = await runAssessment(assessmentContext, { useExternalScanners: true });

    // Build basic lineage graph (for database storage)
    const graphContext = {
      components: [],
      apiCalls: [],
      endpoints: [],
      queries: [],
      tables: [],
    };
    const lineageGraph = buildLineageGraph(graphContext);

    // Save to database if enabled
    let analysisId: number | null = null;
    try {
      analysisId = await saveAnalysisResult({
        repository: repoId,
        repositoryUrl: `https://github.com/${repoId}`,
        techStack,
        assessmentResult: assessment,
        lineageGraph,
      });
      logger.info('Analysis saved to database', { analysisId, repository: repoId });
    } catch (dbError: any) {
      logger.warn('Failed to save analysis to database', {
        error: dbError.message,
        repository: repoId,
      });
      // Continue without database save
    }

    // Save report
    progress.increment();
    const { generateAssessmentReport } = await import('../../reporting/generator');
    const report = generateAssessmentReport(assessment);

    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(outputPath, report);
    logger.info('Assessment complete', { output: outputPath });

    progress.complete();
    console.log(`\n✓ Assessment report saved to: ${outputPath}`);
    if (analysisId) {
      console.log(`✓ Analysis saved to database (ID: ${analysisId})`);
    }
    console.log(`  Security Score: ${assessment.summary.securityScore}/100`);
    console.log(`  Quality Score: ${assessment.summary.qualityScore}/100`);
    console.log(`  Architecture Score: ${assessment.summary.architectureScore}/100`);
  } catch (error: any) {
    logger.error('Assessment failed', { error: error.message, stack: error.stack });
    throw error;
  }
}

