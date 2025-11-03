/**
 * REST API server for Code Assessment Platform
 */

import { Express } from 'express';
import express from 'express';
import { GitHubService } from '../github/service';
import { TechStackDetector } from '../detection';
import { parseChangeRequest } from '../impact/change-parser';

export interface ServerOptions {
  port?: number;
  githubToken?: string;
}

/**
 * Create and configure Express server
 */
export function createServer(options: ServerOptions = {}): Express {
  const app = express();
  const port = options.port || 3000;

  app.use(express.json());

  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Analyze repository endpoint
  app.post('/api/analyze', async (req, res) => {
    try {
      const { repo, token } = req.body;

      if (!repo) {
        return res.status(400).json({ error: 'Repository URL or owner/repo required' });
      }

      const githubService = new GitHubService(token || options.githubToken);
      const [owner, repoName] = parseRepo(repo);

      // Clone and analyze repository
      const analysis = await githubService.cloneAndAnalyzeRepository(`${owner}/${repoName}`);
      const detector = new TechStackDetector();
      const techStack = detector.detectTechStack({
        fileTree: analysis.fileTree,
        configFiles: analysis.configFiles,
        entryPoints: analysis.entryPoints,
      });

      const frontendFrameworks = Array.isArray(techStack.frontend) ? techStack.frontend : [];
      const backendFrameworks = Array.isArray(techStack.backend) ? techStack.backend : [];
      const databases = Array.isArray(techStack.database) ? techStack.database : [];

      res.json({
        success: true,
        repository: `${owner}/${repoName}`,
        techStack: {
          frontend: frontendFrameworks.length > 0 ? frontendFrameworks[0].name : null,
          backend: backendFrameworks.length > 0 ? backendFrameworks[0].name : null,
          databases: databases.map((d: any) => d.name),
        },
        fileCount: analysis.fileTree.files.size,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Impact analysis endpoint
  app.post('/api/impact', async (req, res) => {
    try {
      const { change, lineageGraph, dependencyGraph } = req.body;

      if (!change) {
        return res.status(400).json({ error: 'Change description required' });
      }

      const changeRequest = parseChangeRequest(change);

      res.json({
        success: true,
        changeRequest,
        message: 'Impact analysis would be performed here',
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Export graph endpoint
  app.post('/api/export', (req, res) => {
    try {
      const { graph, format } = req.body;

      if (!graph) {
        return res.status(400).json({ error: 'Lineage graph required' });
      }

      // Export based on format
      const exportFormat = format || 'json';
      // TODO: Implement actual export logic

      res.json({
        success: true,
        format: exportFormat,
        message: 'Graph export would be performed here',
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  return app;
}

/**
 * Start server
 */
export function startServer(options: ServerOptions = {}): void {
  const app = createServer(options);
  const port = options.port || 3000;

  app.listen(port, () => {
    console.log(`Code Assessment API server running on port ${port}`);
  });
}

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

