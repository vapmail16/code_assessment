/**
 * REST API server for Code Assessment Platform
 */

import { Express } from 'express';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { GitHubService } from '../github/service';
import { TechStackDetector } from '../detection';
import { parseChangeRequest } from '../impact/change-parser';
import { exportToJSON, exportToGraphML, exportToCytoscape } from '../visualization';
import { loadConfig } from '../config';
import { logger } from '../utils/logger';
import { formatError } from '../utils/errors';
import { initializeDatabase, runMigrations, testConnection } from '../database';

export interface ServerOptions {
  port?: number;
  host?: string;
  githubToken?: string;
}

/**
 * Create and configure Express server
 */
export function createServer(options: ServerOptions = {}): Express {
  const app = express();
  const config = loadConfig();

  // Security middleware
  app.use(helmet());
  
  // CORS
  if (config.server.cors.enabled) {
    app.use(cors({
      origin: config.server.cors.origin,
      credentials: true,
    }));
  }

  // Rate limiting
  if (config.server.rateLimit.enabled) {
    const limiter = rateLimit({
      windowMs: config.server.rateLimit.windowMs,
      max: config.server.rateLimit.max,
      message: 'Too many requests from this IP, please try again later.',
      standardHeaders: true,
      legacyHeaders: false,
    });
    app.use('/api/', limiter);
  }

  app.use(express.json());

  // Request logging
  app.use((req, res, next) => {
    logger.info(`${req.method} ${req.path}`, {
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
    next();
  });

  // Health check
  app.get('/health', async (req, res) => {
    const { getDatabaseService } = await import('../database/service');
    const dbService = getDatabaseService();
    const dbHealthy = await dbService.healthCheck();

    res.json({
      status: dbHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      database: dbHealthy ? 'connected' : 'disconnected',
    });
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
      logger.error('Analysis failed', { error: error.message, stack: error.stack });
      const formattedError = formatError(error);
      res.status(formattedError.statusCode).json({
        error: formattedError.message,
        code: formattedError.code,
      });
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
      logger.error('Analysis failed', { error: error.message, stack: error.stack });
      const formattedError = formatError(error);
      res.status(formattedError.statusCode).json({
        error: formattedError.message,
        code: formattedError.code,
      });
    }
  });

  // Export graph endpoint
  app.post('/api/export', (req, res) => {
    try {
      const { graph, format } = req.body;

      if (!graph) {
        return res.status(400).json({ error: 'Lineage graph required' });
      }

      const exportFormat = format || 'json';
      let exported: string | object;

      switch (exportFormat) {
        case 'json':
          exported = exportToJSON(graph, true);
          res.setHeader('Content-Type', 'application/json');
          res.send(exported);
          return;
        case 'graphml':
          exported = exportToGraphML(graph);
          res.setHeader('Content-Type', 'application/xml');
          res.send(exported);
          return;
        case 'cytoscape':
          exported = exportToCytoscape(graph);
          res.setHeader('Content-Type', 'application/json');
          res.json(exported);
          return;
        default:
          return res.status(400).json({ error: `Unsupported format: ${exportFormat}` });
      }
    } catch (error: any) {
      logger.error('Export failed', { error: error.message, stack: error.stack });
      const formattedError = formatError(error);
      res.status(formattedError.statusCode).json({
        error: formattedError.message,
        code: formattedError.code,
      });
    }
  });

  return app;
}

/**
 * Start server
 */
export async function startServer(options: ServerOptions = {}): Promise<void> {
  const app = createServer(options);
  const config = loadConfig();
  const port = options.port || config.server.port;
  const host = options.host || config.server.host;

  // Initialize database connection
  try {
    initializeDatabase(config.database);
    await runMigrations();
    logger.info('Database initialized and migrations completed');
  } catch (error: any) {
    logger.warn('Database initialization failed, continuing without persistence', {
      error: error.message,
    });
  }

  app.listen(port, host, () => {
    logger.info(`Code Assessment API server running on ${host}:${port}`);
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

