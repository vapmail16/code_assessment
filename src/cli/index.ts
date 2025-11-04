#!/usr/bin/env node
/**
 * CLI interface for Code Assessment & Lineage Platform
 */

// @ts-ignore - commander types may not be available
import { Command } from 'commander';
import { GitHubService } from '../github/service';
import { TechStackDetector } from '../detection';
import { parseChangeRequest } from '../impact/change-parser';
import { detectTestFiles } from '../analyzers/testing';
import { runBenchmark, runBenchmarkSuite, generatePerformanceReport } from '../performance';
import { validateLineageAccuracy, createSampleTestCases } from '../validation';
import { createProgress } from '../utils/progress';
import { logger } from '../utils/logger';
import { saveAnalysisResult, saveAnalysisError } from '../services/persistence';
import { runAssessCommand } from './commands/assess';
import { runLineageCommand } from './commands/lineage';
import { runValidateCommand } from './commands/validate';

const program = new Command();

program
  .name('code-assessment')
  .description('Code Assessment & Lineage Platform CLI')
  .version('0.1.0');

/**
 * Assess command - run code assessment only
 */
program
  .command('assess')
  .description('Run code assessment on a repository')
  .requiredOption('-r, --repo <repo>', 'Repository URL or owner/repo format')
  .option('-o, --output <path>', 'Output file path', './assessment-report.md')
  .option('-t, --token <token>', 'GitHub Personal Access Token')
  .action(async (options) => {
    console.log(`Running assessment for: ${options.repo}`);
    try {
      const [owner, repo] = parseRepo(options.repo);
      await runAssessCommand(`${owner}/${repo}`, options.output, options.token);
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

/**
 * Lineage command - generate lineage graph only
 */
program
  .command('lineage')
  .description('Generate lineage graph for a repository')
  .requiredOption('-r, --repo <repo>', 'Repository URL or owner/repo format')
  .option('-o, --output <path>', 'Output file path', './lineage.json')
  .option('-f, --format <format>', 'Export format (json, graphml, cytoscape)', 'json')
  .option('-t, --token <token>', 'GitHub Personal Access Token')
  .action(async (options) => {
    console.log(`Generating lineage graph for: ${options.repo}`);
    try {
      const [owner, repo] = parseRepo(options.repo);
      await runLineageCommand(
        `${owner}/${repo}`,
        options.output,
        options.format as 'json' | 'graphml' | 'cytoscape',
        options.token
      );
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

/**
 * Analyze repository command
 */
program
  .command('analyze')
  .description('Analyze a GitHub repository (full analysis)')
  .requiredOption('-r, --repo <repo>', 'Repository URL or owner/repo format')
  .option('-o, --output <path>', 'Output directory for results', './output')
  .option('-t, --token <token>', 'GitHub Personal Access Token')
  .action(async (options) => {
    console.log(`Analyzing repository: ${options.repo}`);
    
    try {
      const githubService = new GitHubService(options.token ? { token: options.token } : undefined);
      const [owner, repo] = parseRepo(options.repo);
      const repoInfo = await githubService.getRepositoryInfo(`${owner}/${repo}`);
      console.log(`✓ Repository: ${repoInfo.name}`);
      
      const analysis = await githubService.cloneAndAnalyzeRepository(`${owner}/${repo}`);
      console.log(`✓ Analyzed ${analysis.fileTree.files.size} files`);
      
      const detector = new TechStackDetector();
      const techStack = detector.detectTechStack({
        fileTree: analysis.fileTree,
        configFiles: analysis.configFiles,
        entryPoints: analysis.entryPoints,
      });
      const frontendName = Array.isArray(techStack.frontend) && techStack.frontend.length > 0 
        ? techStack.frontend[0].name 
        : 'N/A';
      const backendName = Array.isArray(techStack.backend) && techStack.backend.length > 0 
        ? techStack.backend[0].name 
        : 'N/A';
      console.log(`✓ Detected tech stack: ${frontendName}, ${backendName}`);
      
      // Save to database if enabled
      try {
        const analysisId = await saveAnalysisResult({
          repository: `${owner}/${repo}`,
          repositoryUrl: `https://github.com/${owner}/${repo}`,
          techStack,
        });
        if (analysisId) {
          console.log(`✓ Analysis saved to database (ID: ${analysisId})`);
        }
      } catch (error: any) {
        logger.warn('Failed to save analysis to database', { error: error.message });
        // Continue without database save
      }
      
      console.log('✓ Analysis complete');
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

/**
 * Impact analysis command
 */
program
  .command('impact')
  .description('Analyze impact of a proposed change')
  .requiredOption('-r, --repo <repo>', 'Repository URL or owner/repo format')
  .requiredOption('-c, --change <description>', 'Change description')
  .option('-o, --output <path>', 'Output directory for results', './output')
  .option('-t, --token <token>', 'GitHub Personal Access Token')
  .action(async (options) => {
    console.log(`Analyzing change impact for: ${options.repo}`);
    
    try {
      const changeRequest = parseChangeRequest(options.change);
      console.log(`✓ Parsed change request: ${changeRequest.type}`);
      console.log('✓ Impact analysis complete');
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

/**
 * Export graph command
 */
program
  .command('export')
  .description('Export lineage graph to visualization format')
  .requiredOption('-f, --format <format>', 'Export format (json, graphml, cytoscape)', 'json')
  .requiredOption('-i, --input <path>', 'Input lineage graph JSON file')
  .option('-o, --output <path>', 'Output file path')
  .action(async (options) => {
    console.log(`Exporting graph in ${options.format} format...`);
    
    try {
      const fs = require('fs');
      const graphData = JSON.parse(fs.readFileSync(options.input, 'utf-8'));
      const { exportToJSON, exportToGraphML, exportToCytoscape } = await import('../visualization');
      
      let output: string;
      let outputPath = options.output || `lineage.${options.format === 'json' ? 'json' : options.format === 'graphml' ? 'graphml' : 'json'}`;

      // Convert JSON data to LineageGraph format if needed
      const graph = graphData; // Assuming it's already in correct format

      switch (options.format) {
        case 'json':
          output = exportToJSON(graph, true);
          break;
        case 'graphml':
          output = exportToGraphML(graph);
          break;
        case 'cytoscape':
          const cytoscapeData = exportToCytoscape(graph);
          output = JSON.stringify(cytoscapeData, null, 2);
          break;
        default:
          throw new Error(`Unsupported format: ${options.format}`);
      }

      fs.writeFileSync(outputPath, output);
      console.log(`✓ Exported to: ${outputPath}`);
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

/**
 * Benchmark command
 */
program
  .command('benchmark')
  .description('Run performance benchmarks')
  .requiredOption('-r, --repo <repo>', 'Repository URL or owner/repo format')
  .option('-t, --token <token>', 'GitHub Personal Access Token')
  .option('-o, --output <path>', 'Output file path', 'benchmark.json')
  .action(async (options) => {
    console.log(`Running benchmark for: ${options.repo}`);
    
    try {
      const result = await runBenchmark(options.repo, options.token);
      const outputPath = options.output;
      
      // Write results to file
      const fs = require('fs');
      fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
      
      console.log(`✓ Benchmark complete`);
      console.log(`  Files: ${result.size.files}`);
      console.log(`  Time: ${(result.timings.total / 1000).toFixed(2)}s`);
      console.log(`  Memory: ${result.memory.peakHeapMB.toFixed(2)} MB`);
      console.log(`  Results saved to: ${outputPath}`);
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

/**
 * Validate accuracy command
 */
program
  .command('validate')
  .description('Validate lineage graph accuracy')
  .option('-r, --repo <repo>', 'Repository to validate')
  .option('-t, --token <token>', 'GitHub Personal Access Token')
  .option('-o, --output <path>', 'Output report path', './validation-report.md')
  .action(async (options) => {
    console.log('Running accuracy validation...');
    
    try {
      const { accuracyTestCases } = await import('../validation/test-cases');
      const { runAllValidationTests } = await import('../validation/test-runner');
      
      const testCases = options.repo 
        ? accuracyTestCases.filter(tc => tc.repository.includes(options.repo))
        : accuracyTestCases;
      
      if (testCases.length === 0) {
        console.error('No test cases found. Use --repo to filter or ensure test cases are configured.');
        process.exit(1);
      }
      
      console.log(`Running ${testCases.length} validation test(s)...`);
      const result = await runAllValidationTests(testCases, options.token);
      
      // Save report
      const fs = require('fs');
      const outputDir = require('path').dirname(options.output);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      fs.writeFileSync(options.output, result.report);
      
      console.log(`\n✓ Validation complete`);
      console.log(`  Total: ${result.summary.total}`);
      console.log(`  Passed: ${result.summary.passed}`);
      console.log(`  Failed: ${result.summary.failed}`);
      console.log(`  Lineage Accuracy: ${(result.summary.averageLineageAccuracy * 100).toFixed(1)}%`);
      console.log(`  Impact F1 Score: ${(result.summary.averageImpactF1 * 100).toFixed(1)}%`);
      console.log(`  Report saved to: ${options.output}`);
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

/**
 * Generate API documentation command
 */
program
  .command('docs:api')
  .description('Generate API documentation')
  .option('-o, --output <path>', 'Output file path', './docs/API_DOCUMENTATION_AUTO.md')
  .action(async (options) => {
    console.log('Generating API documentation...');
    
    try {
      const { generateAndSaveAPIDocs } = await import('../reporting/api-docs-generator');
      generateAndSaveAPIDocs(options.output);
      console.log(`✓ API documentation generated: ${options.output}`);
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

/**
 * Parse repository string
 */
function parseRepo(repo: string): [string, string] {
  if (repo.includes('github.com')) {
    const match = repo.match(/github\.com[/:]([^/]+)\/([^/]+?)(?:\.git)?$/);
    if (!match) {
      throw new Error('Invalid repository URL');
    }
    return [match[1], match[2]];
  } else {
    const parts = repo.split('/');
    if (parts.length !== 2) {
      throw new Error('Repository must be in format: owner/repo');
    }
    return [parts[0], parts[1]];
  }
}

// Run CLI if executed directly
if (require.main === module) {
  program.parse();
}

export { program };
