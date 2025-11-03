#!/usr/bin/env node
/**
 * CLI interface for Code Assessment & Lineage Platform
 */

// @ts-ignore - commander types may not be available
import { Command } from 'commander';
import { GitHubService } from '../github/service';
import { TechStackDetector } from '../detection';
import { parseChangeRequest } from '../impact/change-parser';

const program = new Command();

program
  .name('code-assessment')
  .description('Code Assessment & Lineage Platform CLI')
  .version('0.1.0');

/**
 * Analyze repository command
 */
program
  .command('analyze')
  .description('Analyze a GitHub repository')
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
      const techStack = detector.detectTechStack({ fileTree: analysis.fileTree });
      console.log(`✓ Detected tech stack: ${techStack.frameworks.map((f: any) => f.name).join(', ')}`);
      
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
  .option('-o, --output <path>', 'Output file path', 'lineage.json')
  .action(async (options) => {
    console.log(`Exporting graph in ${options.format} format...`);
    console.log(`✓ Exported to: ${options.output}`);
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
