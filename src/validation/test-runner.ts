/**
 * Test runner for accuracy validation
 */

import { ValidationTestCase, validateLineageAccuracy, validateImpactAccuracy, generateAccuracyReport } from './accuracy';
import { accuracyTestCases } from './test-cases';
import { LineageGraph } from '../types';
import { ImpactAnalysis } from '../types';
import { GitHubService } from '../github/service';
import { TechStackDetector } from '../detection';
import { buildLineageGraph, LineageGraphContext } from '../lineage/graph-builder';
import { analyzeChangeImpact, ImpactAnalysisContext } from '../impact/analyzer';
import { parseChangeRequest } from '../impact/change-parser';
import { logger } from '../utils/logger';

export interface ValidationResult {
  testCase: ValidationTestCase;
  success: boolean;
  lineageMetrics?: {
    overall: number;
    frontendToBackend: number;
    backendToDatabase: number;
  };
  impactMetrics?: {
    precision: number;
    recall: number;
    f1Score: number;
  };
  errors?: string[];
}

/**
 * Run validation against a test repository
 */
export async function runValidationTest(
  testCase: ValidationTestCase,
  githubToken?: string
): Promise<ValidationResult> {
  const errors: string[] = [];

  try {
    logger.info('Running validation test', { testCase: testCase.id });

    // Clone and analyze repository
    const githubService = new GitHubService(githubToken ? { token: githubToken } : undefined);
    const analysis = await githubService.cloneAndAnalyzeRepository(testCase.repository);

    // Detect tech stack
    const detector = new TechStackDetector();
    const techStack = detector.detectTechStack({
      fileTree: analysis.fileTree,
      configFiles: analysis.configFiles,
      entryPoints: analysis.entryPoints,
    });

    // Build lineage graph (simplified - would need full parsing in production)
    const graphContext: LineageGraphContext = {
      components: [],
      apiCalls: [],
      endpoints: [],
      queries: [],
      tables: [],
    };
    const graph = buildLineageGraph(graphContext);

    // Validate lineage accuracy
    const lineageMetrics = validateLineageAccuracy(graph, [testCase]);

    // If impact test case provided, validate impact analysis
    let impactMetrics;
    if (testCase.expectedImpact) {
      const changeRequest = parseChangeRequest(testCase.expectedImpact.change);
      const impactContext: ImpactAnalysisContext = {
        changeRequest,
        lineageGraph: graph,
        endpoints: [],
        queries: [],
        components: [],
      };
      const impact = analyzeChangeImpact(impactContext);
      impactMetrics = validateImpactAccuracy(impact, [testCase]);
    }

    const success =
      lineageMetrics.crossLayerTracing.overall >= 0.8 &&
      (!impactMetrics || impactMetrics.f1Score >= 0.7);

    return {
      testCase,
      success,
      lineageMetrics: {
        overall: lineageMetrics.crossLayerTracing.overall,
        frontendToBackend: lineageMetrics.crossLayerTracing.frontendToBackend,
        backendToDatabase: lineageMetrics.crossLayerTracing.backendToDatabase,
      },
      impactMetrics: impactMetrics
        ? {
            precision: impactMetrics.precision,
            recall: impactMetrics.recall,
            f1Score: impactMetrics.f1Score,
          }
        : undefined,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error: any) {
    logger.error('Validation test failed', {
      testCase: testCase.id,
      error: error.message,
    });
    return {
      testCase,
      success: false,
      errors: [error.message],
    };
  }
}

/**
 * Run all validation tests
 */
export async function runAllValidationTests(
  testCases: ValidationTestCase[],
  githubToken?: string
): Promise<{
  results: ValidationResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    averageLineageAccuracy: number;
    averageImpactF1: number;
  };
  report: string;
}> {
  const results: ValidationResult[] = [];

  logger.info('Starting validation test suite', { count: testCases.length });

  for (const testCase of testCases) {
    const result = await runValidationTest(testCase, githubToken);
    results.push(result);
  }

  const passed = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  const lineageAccuracies = results
    .map((r) => r.lineageMetrics?.overall)
    .filter((a): a is number => a !== undefined);
  const averageLineageAccuracy =
    lineageAccuracies.length > 0
      ? lineageAccuracies.reduce((sum, a) => sum + a, 0) / lineageAccuracies.length
      : 0;

  const impactF1Scores = results
    .map((r) => r.impactMetrics?.f1Score)
    .filter((f): f is number => f !== undefined);
  const averageImpactF1 =
    impactF1Scores.length > 0
      ? impactF1Scores.reduce((sum, f) => sum + f, 0) / impactF1Scores.length
      : 0;

  const summary = {
    total: results.length,
    passed,
    failed,
    averageLineageAccuracy,
    averageImpactF1,
  };

  // Generate report
  const report = generateValidationReport(results, summary);

  return {
    results,
    summary,
    report,
  };
}

/**
 * Generate validation test report
 */
function generateValidationReport(
  results: ValidationResult[],
  summary: {
    total: number;
    passed: number;
    failed: number;
    averageLineageAccuracy: number;
    averageImpactF1: number;
  }
): string {
  const lines: string[] = [];

  lines.push('# Accuracy Validation Test Report');
  lines.push('');
  lines.push(`**Date**: ${new Date().toISOString()}`);
  lines.push(`**Total Tests**: ${summary.total}`);
  lines.push(`**Passed**: ${summary.passed}`);
  lines.push(`**Failed**: ${summary.failed}`);
  lines.push(`**Success Rate**: ${((summary.passed / summary.total) * 100).toFixed(1)}%`);
  lines.push('');

  lines.push('## Summary');
  lines.push('');
  lines.push(`- **Average Lineage Accuracy**: ${(summary.averageLineageAccuracy * 100).toFixed(1)}%`);
  lines.push(`- **Average Impact Analysis F1 Score**: ${(summary.averageImpactF1 * 100).toFixed(1)}%`);
  lines.push('');

  lines.push('## Test Results');
  lines.push('');

  for (const result of results) {
    const status = result.success ? '✅ PASS' : '❌ FAIL';
    lines.push(`### ${result.testCase.id} - ${status}`);
    lines.push('');
    lines.push(`**Description**: ${result.testCase.description}`);
    lines.push(`**Repository**: ${result.testCase.repository}`);
    lines.push('');

    if (result.lineageMetrics) {
      lines.push('**Lineage Accuracy**:');
      lines.push(`- Overall: ${(result.lineageMetrics.overall * 100).toFixed(1)}%`);
      lines.push(`- Frontend → Backend: ${(result.lineageMetrics.frontendToBackend * 100).toFixed(1)}%`);
      lines.push(`- Backend → Database: ${(result.lineageMetrics.backendToDatabase * 100).toFixed(1)}%`);
      lines.push('');
    }

    if (result.impactMetrics) {
      lines.push('**Impact Analysis**:');
      lines.push(`- Precision: ${(result.impactMetrics.precision * 100).toFixed(1)}%`);
      lines.push(`- Recall: ${(result.impactMetrics.recall * 100).toFixed(1)}%`);
      lines.push(`- F1 Score: ${(result.impactMetrics.f1Score * 100).toFixed(1)}%`);
      lines.push('');
    }

    if (result.errors) {
      lines.push('**Errors**:');
      for (const error of result.errors) {
        lines.push(`- ${error}`);
      }
      lines.push('');
    }
  }

  return lines.join('\n');
}

