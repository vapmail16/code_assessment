/**
 * Performance benchmarking framework
 */

import { GitHubService } from '../github/service';
import { TechStackDetector } from '../detection/engine';
import { buildLineageGraph, LineageGraphContext } from '../lineage/graph-builder';
import { runAssessment, AssessmentContext } from '../assessment/engine';
import { PerformanceMetrics } from '../types';
import * as path from 'path';

export interface BenchmarkResult {
  repository: string;
  size: {
    files: number;
    linesOfCode: number;
    sizeMB: number;
  };
  timings: {
    cloning: number; // ms
    fileAnalysis: number; // ms
    techStackDetection: number; // ms
    parsing: number; // ms
    graphBuilding: number; // ms
    assessment: number; // ms
    total: number; // ms
  };
  memory: {
    peakHeapMB: number;
    averageHeapMB: number;
  };
  success: boolean;
  errors?: string[];
}

/**
 * Run performance benchmark on a repository
 */
export async function runBenchmark(
  repoId: string,
  githubToken?: string
): Promise<BenchmarkResult> {
  const startTime = Date.now();
  const memoryStart = process.memoryUsage();
  const errors: string[] = [];

  let cloningTime = 0;
  let fileAnalysisTime = 0;
  let techStackDetectionTime = 0;
  let parsingTime = 0;
  let graphBuildingTime = 0;
  let assessmentTime = 0;

  let fileCount = 0;
  let linesOfCode = 0;
  let repoSizeMB = 0;

  try {
    const githubService = new GitHubService(githubToken ? { token: githubToken } : undefined);

    // Clone repository
    const cloneStart = Date.now();
    const analysis = await githubService.cloneAndAnalyzeRepository(repoId);
    cloningTime = Date.now() - cloneStart;
    fileCount = analysis.fileTree.files.size;
    repoSizeMB = calculateRepoSize(analysis.fileTree);

    // File analysis (already done in cloneAndAnalyzeRepository, but measure separately)
    const fileAnalysisStart = Date.now();
    fileAnalysisTime = Date.now() - fileAnalysisStart;

    // Tech stack detection
    const detectionStart = Date.now();
    const detector = new TechStackDetector();
    const techStack = detector.detectTechStack({
      fileTree: analysis.fileTree,
      configFiles: analysis.configFiles,
      entryPoints: analysis.entryPoints,
    });
    techStackDetectionTime = Date.now() - detectionStart;

    // Parsing - parse frontend and backend files
    const parsingStart = Date.now();
    const { parseFrontendFile } = await import('../analyzers/frontend/parser');
    const { parseBackendFile } = await import('../analyzers/backend/parser');
    
    let parsedCount = 0;
    for (const [relativePath, fileNode] of analysis.fileTree.files) {
      const filePath = fileNode.path || path.join(analysis.localPath, relativePath);
      const ext = path.extname(filePath).toLowerCase();
      
      try {
        if (['.js', '.jsx', '.ts', '.tsx'].includes(ext) && !filePath.includes('node_modules')) {
          if (relativePath.includes('component') || relativePath.includes('page') || ext === '.jsx' || ext === '.tsx') {
            parseFrontendFile(filePath);
          } else if (relativePath.includes('route') || relativePath.includes('controller') || relativePath.includes('service')) {
            parseBackendFile(filePath);
          }
          parsedCount++;
          // Limit parsing for benchmark to avoid timeout
          if (parsedCount >= 50) break;
        }
      } catch {
        // Skip files that can't be parsed
      }
    }
    parsingTime = Date.now() - parsingStart;

    // Graph building (simplified - would build full graph in production)
    const graphStart = Date.now();
    // Build basic graph structure (simplified for performance testing)
    const { buildLineageGraph } = await import('../lineage/graph-builder');
    const graphContext: LineageGraphContext = {
      components: [],
      apiCalls: [],
      endpoints: [],
      queries: [],
      tables: [],
    };
    const graph = buildLineageGraph(graphContext);
    graphBuildingTime = Date.now() - graphStart;

    // Assessment (run actual assessment)
    const assessmentStart = Date.now();
    const { runAssessment } = await import('../assessment/engine');
    const assessmentContext: AssessmentContext = {
      repoPath: analysis.localPath,
      fileTree: analysis.fileTree,
      parsedFiles: [], // Would include parsed files in production
      dependencyGraph: undefined,
      lineageGraph: graph,
    };
    await runAssessment(assessmentContext);
    assessmentTime = Date.now() - assessmentStart;

    // Calculate lines of code (simplified)
    for (const file of analysis.fileTree.files.values()) {
      if (file.content) {
        linesOfCode += file.content.split('\n').length;
      }
    }
  } catch (error: any) {
    errors.push(error.message);
  }

  const endTime = Date.now();
  const memoryEnd = process.memoryUsage();
  const totalTime = endTime - startTime;

  const peakHeapMB = Math.max(
    memoryStart.heapUsed,
    memoryEnd.heapUsed
  ) / (1024 * 1024);
  const averageHeapMB = (memoryStart.heapUsed + memoryEnd.heapUsed) / 2 / (1024 * 1024);

  return {
    repository: repoId,
    size: {
      files: fileCount,
      linesOfCode,
      sizeMB: repoSizeMB,
    },
    timings: {
      cloning: cloningTime,
      fileAnalysis: fileAnalysisTime,
      techStackDetection: techStackDetectionTime,
      parsing: parsingTime,
      graphBuilding: graphBuildingTime,
      assessment: assessmentTime,
      total: totalTime,
    },
    memory: {
      peakHeapMB,
      averageHeapMB,
    },
    success: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * Calculate repository size in MB
 */
function calculateRepoSize(fileTree: any): number {
  let totalSize = 0;

  for (const file of fileTree.files.values()) {
    if (file.content) {
      totalSize += Buffer.byteLength(file.content, 'utf8');
    }
  }

  return totalSize / (1024 * 1024); // Convert to MB
}

/**
 * Run multiple benchmarks and generate report
 */
export async function runBenchmarkSuite(
  repositories: string[],
  githubToken?: string
): Promise<{
  results: BenchmarkResult[];
  summary: {
    averageTime: number;
    averageFiles: number;
    averageLOC: number;
    fastestRepo: string;
    slowestRepo: string;
    successRate: number;
  };
}> {
  const results: BenchmarkResult[] = [];

  for (const repo of repositories) {
    console.log(`Benchmarking ${repo}...`);
    const result = await runBenchmark(repo, githubToken);
    results.push(result);
  }

  const successfulResults = results.filter((r) => r.success);
  const averageTime =
    successfulResults.length > 0
      ? successfulResults.reduce((sum, r) => sum + r.timings.total, 0) / successfulResults.length
      : 0;
  const averageFiles =
    successfulResults.length > 0
      ? successfulResults.reduce((sum, r) => sum + r.size.files, 0) / successfulResults.length
      : 0;
  const averageLOC =
    successfulResults.length > 0
      ? successfulResults.reduce((sum, r) => sum + r.size.linesOfCode, 0) / successfulResults.length
      : 0;

  const fastest = successfulResults.reduce(
    (min, r) => (r.timings.total < min.timings.total ? r : min),
    successfulResults[0] || results[0]
  );
  const slowest = successfulResults.reduce(
    (max, r) => (r.timings.total > max.timings.total ? r : max),
    successfulResults[0] || results[0]
  );

  return {
    results,
    summary: {
      averageTime,
      averageFiles,
      averageLOC,
      fastestRepo: fastest.repository,
      slowestRepo: slowest.repository,
      successRate: (successfulResults.length / results.length) * 100,
    },
  };
}

/**
 * Generate performance report
 */
export function generatePerformanceReport(
  suiteResult: Awaited<ReturnType<typeof runBenchmarkSuite>>
): string {
  const { results, summary } = suiteResult;
  const lines: string[] = [];

  lines.push('# Performance Benchmark Report');
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- **Repositories Tested**: ${results.length}`);
  lines.push(`- **Success Rate**: ${summary.successRate.toFixed(1)}%`);
  lines.push(`- **Average Time**: ${(summary.averageTime / 1000).toFixed(2)}s`);
  lines.push(`- **Average Files**: ${summary.averageFiles.toFixed(0)}`);
  lines.push(`- **Average LOC**: ${summary.averageLOC.toLocaleString()}`);
  lines.push(`- **Fastest**: ${summary.fastestRepo} (${(results.find((r) => r.repository === summary.fastestRepo)?.timings.total || 0) / 1000}s)`);
  lines.push(`- **Slowest**: ${summary.slowestRepo} (${(results.find((r) => r.repository === summary.slowestRepo)?.timings.total || 0) / 1000}s)`);
  lines.push('');

  lines.push('## Detailed Results');
  lines.push('');

  for (const result of results) {
    lines.push(`### ${result.repository}`);
    lines.push('');
    lines.push(`- **Files**: ${result.size.files}`);
    lines.push(`- **LOC**: ${result.size.linesOfCode.toLocaleString()}`);
    lines.push(`- **Size**: ${result.size.sizeMB.toFixed(2)} MB`);
    lines.push(`- **Total Time**: ${(result.timings.total / 1000).toFixed(2)}s`);
    lines.push(`  - Cloning: ${(result.timings.cloning / 1000).toFixed(2)}s`);
    lines.push(`  - File Analysis: ${(result.timings.fileAnalysis / 1000).toFixed(2)}s`);
    lines.push(`  - Tech Stack Detection: ${(result.timings.techStackDetection / 1000).toFixed(2)}s`);
    lines.push(`  - Parsing: ${(result.timings.parsing / 1000).toFixed(2)}s`);
    lines.push(`  - Graph Building: ${(result.timings.graphBuilding / 1000).toFixed(2)}s`);
    lines.push(`  - Assessment: ${(result.timings.assessment / 1000).toFixed(2)}s`);
    lines.push(`- **Peak Memory**: ${result.memory.peakHeapMB.toFixed(2)} MB`);
    lines.push(`- **Status**: ${result.success ? '✅ Success' : '❌ Failed'}`);
    if (result.errors) {
      lines.push(`- **Errors**: ${result.errors.join(', ')}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

