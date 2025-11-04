/**
 * Lineage graph generation command implementation
 */

import { GitHubService } from '../../github/service';
import { TechStackDetector } from '../../detection';
import { buildLineageGraph, LineageGraphContext } from '../../lineage/graph-builder';
import { exportToJSON, exportToGraphML, exportToCytoscape } from '../../visualization';
import { createProgress } from '../../utils/progress';
import { logger } from '../../utils/logger';
import { saveAnalysisResult } from '../../services/persistence';
import { parseFrontendFile } from '../../analyzers/frontend/parser';
import { parseBackendFile } from '../../analyzers/backend/parser';
import { extractEndpoints } from '../../analyzers/backend/endpoint-extractor';
import { detectDatabaseQueries } from '../../analyzers/backend/query-detector';
import { detectReactComponents } from '../../analyzers/frontend/component-detector';
import { detectAPICalls } from '../../analyzers/frontend/api-detector';
import * as fs from 'fs';
import * as path from 'path';

export async function runLineageCommand(
  repoId: string,
  outputPath: string,
  format: 'json' | 'graphml' | 'cytoscape' = 'json',
  token?: string
): Promise<void> {
  const progress = createProgress(6);

  try {
    const githubService = new GitHubService(token ? { token } : undefined);

    // Clone and analyze
    progress.increment();
    logger.info('Cloning repository', { repo: repoId });
    const analysis = await githubService.cloneAndAnalyzeRepository(repoId);

    // Parse files
    progress.increment();
    logger.info('Parsing code files', { files: analysis.fileTree.files.size });
    
    const components: any[] = [];
    const apiCalls: any[] = [];
    const endpoints: any[] = [];
    const queries: any[] = [];
    const tables: any[] = [];

    // Parse frontend files
    for (const [relativePath, fileNode] of analysis.fileTree.files) {
      const filePath = fileNode.path || path.join(analysis.localPath, relativePath);
      const ext = path.extname(filePath).toLowerCase();
      
      if (['.jsx', '.tsx'].includes(ext) && !filePath.includes('node_modules')) {
        try {
          const parsed = parseFrontendFile(filePath);
          if (parsed) {
            const detectedComponents = detectReactComponents(parsed);
            const detectedCalls = detectAPICalls(parsed);
            components.push(...detectedComponents);
            apiCalls.push(...detectedCalls);
          }
        } catch {
          // Skip unparseable files
        }
      }
    }

    // Parse backend files
    progress.increment();
    for (const [relativePath, fileNode] of analysis.fileTree.files) {
      const filePath = fileNode.path || path.join(analysis.localPath, relativePath);
      const ext = path.extname(filePath).toLowerCase();
      
      if (['.js', '.ts'].includes(ext) && !filePath.includes('node_modules') && !filePath.includes('.test.')) {
        try {
          const parsed = parseBackendFile(filePath);
          if (parsed) {
            const detectedEndpoints = extractEndpoints(parsed);
            const detectedQueries = detectDatabaseQueries(parsed);
            endpoints.push(...detectedEndpoints);
            queries.push(...detectedQueries);
          }
        } catch {
          // Skip unparseable files
        }
      }
    }

    // Build lineage graph
    progress.increment();
    logger.info('Building lineage graph', {
      components: components.length,
      endpoints: endpoints.length,
      queries: queries.length,
    });

    const graphContext: LineageGraphContext = {
      components,
      apiCalls,
      endpoints,
      queries,
      tables,
    };

    const graph = buildLineageGraph(graphContext);

    // Detect tech stack for database storage
    const detector = new TechStackDetector();
    const techStack = detector.detectTechStack({
      fileTree: analysis.fileTree,
      configFiles: analysis.configFiles,
      entryPoints: analysis.entryPoints,
    });

    // Save to database if enabled
    let analysisId: number | null = null;
    try {
      analysisId = await saveAnalysisResult({
        repository: repoId,
        repositoryUrl: `https://github.com/${repoId}`,
        techStack,
        lineageGraph: graph,
      });
      logger.info('Lineage graph saved to database', { analysisId, repository: repoId });
    } catch (dbError: any) {
      logger.warn('Failed to save lineage graph to database', {
        error: dbError.message,
        repository: repoId,
      });
      // Continue without database save
    }

    // Export graph
    progress.increment();
    logger.info('Exporting graph', { format });

    let exported: string | object;
    switch (format) {
      case 'json':
        exported = exportToJSON(graph, true);
        break;
      case 'graphml':
        exported = exportToGraphML(graph);
        break;
      case 'cytoscape':
        exported = exportToCytoscape(graph);
        break;
      default:
        throw new Error(`Unsupported format: ${format}`);
    }

    // Save to file
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    if (typeof exported === 'string') {
      fs.writeFileSync(outputPath, exported);
    } else {
      fs.writeFileSync(outputPath, JSON.stringify(exported, null, 2));
    }

    progress.complete();
    console.log(`\n✓ Lineage graph exported to: ${outputPath}`);
    if (analysisId) {
      console.log(`✓ Lineage graph saved to database (ID: ${analysisId})`);
    }
    console.log(`  Nodes: ${graph.nodes.length}`);
    console.log(`  Edges: ${graph.edges.length}`);
  } catch (error: any) {
    logger.error('Lineage generation failed', { error: error.message, stack: error.stack });
    throw error;
  }
}

