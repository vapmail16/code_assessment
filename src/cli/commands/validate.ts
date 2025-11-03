/**
 * Validation command implementation
 */

import { runAllValidationTests, accuracyTestCases } from '../../validation';
import { logger } from '../../utils/logger';
import { createProgress } from '../../utils/progress';
import * as fs from 'fs';
import * as path from 'path';

export async function runValidateCommand(
  testRepos?: string[],
  outputPath: string = './validation-results.md',
  githubToken?: string
): Promise<void> {
  const progress = createProgress(3);

  try {
    // Determine which test cases to run
    let testCases = accuracyTestCases;

    if (testRepos && testRepos.length > 0) {
      // Filter test cases by repository
      testCases = accuracyTestCases.filter((tc) =>
        testRepos.some((repo) => tc.repository.includes(repo))
      );
    }

    if (testCases.length === 0) {
      console.error('No test cases found for the specified repositories');
      process.exit(1);
    }

    progress.increment();
    logger.info('Starting validation tests', { count: testCases.length });

    // Run validation tests
    progress.increment();
    const result = await runAllValidationTests(testCases, githubToken);

    // Generate and save report
    progress.increment();
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(outputPath, result.report);

    // Also save JSON results
    const jsonPath = outputPath.replace('.md', '.json');
    fs.writeFileSync(
      jsonPath,
      JSON.stringify(
        {
          summary: result.summary,
          results: result.results.map((r) => ({
            testCase: { id: r.testCase.id, description: r.testCase.description },
            success: r.success,
            metrics: {
              lineage: r.lineageMetrics,
              impact: r.impactMetrics,
            },
            errors: r.errors,
          })),
        },
        null,
        2
      )
    );

    progress.complete();

    // Display summary
    console.log('\n📊 Validation Summary:');
    console.log(`  Total Tests: ${result.summary.total}`);
    console.log(`  Passed: ${result.summary.passed}`);
    console.log(`  Failed: ${result.summary.failed}`);
    console.log(
      `  Success Rate: ${((result.summary.passed / result.summary.total) * 100).toFixed(1)}%`
    );
    console.log(
      `  Average Lineage Accuracy: ${(result.summary.averageLineageAccuracy * 100).toFixed(1)}%`
    );
    if (result.summary.averageImpactF1 > 0) {
      console.log(
        `  Average Impact F1 Score: ${(result.summary.averageImpactF1 * 100).toFixed(1)}%`
      );
    }
    console.log(`\n📄 Full report saved to: ${outputPath}`);
    console.log(`📄 JSON results saved to: ${jsonPath}`);

    // Exit with error code if validation failed
    if (result.summary.failed > 0) {
      process.exit(1);
    }
  } catch (error: any) {
    logger.error('Validation failed', { error: error.message, stack: error.stack });
    console.error('Error:', error.message);
    process.exit(1);
  }
}

