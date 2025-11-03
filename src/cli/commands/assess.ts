/**
 * Assessment-only command implementation
 */

import { GitHubService } from '../../github/service';
import { runAssessment, AssessmentContext } from '../../assessment/engine';
import { createProgress } from '../../utils/progress';
import { logger } from '../../utils/logger';
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

    const assessment = await runAssessment(assessmentContext, { useExternalScanners: true });

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
    console.log(`  Security Score: ${assessment.summary.securityScore}/100`);
    console.log(`  Quality Score: ${assessment.summary.qualityScore}/100`);
    console.log(`  Architecture Score: ${assessment.summary.architectureScore}/100`);
  } catch (error: any) {
    logger.error('Assessment failed', { error: error.message, stack: error.stack });
    throw error;
  }
}

