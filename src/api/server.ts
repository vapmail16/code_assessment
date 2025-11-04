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
import { initializeDatabase, testConnection, runMigrations } from '../database';
import { saveAnalysisResult, saveAnalysisError } from '../services/persistence';

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

  // Initialize database if enabled
  if (config.database.enabled) {
    try {
      initializeDatabase({
        host: config.database.host,
        port: config.database.port,
        database: config.database.database,
        user: config.database.user,
        password: config.database.password,
        connectionString: config.database.connectionString,
        ssl: config.database.ssl,
      });

      // Run migrations on startup
      runMigrations().catch((err) => {
        logger.error('Failed to run database migrations', { error: err.message });
      });
    } catch (error: any) {
      logger.warn('Database initialization failed, continuing without persistence', {
        error: error.message,
      });
    }
  }

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

  // Health check with database status
  app.get('/health', async (req, res) => {
    const config = loadConfig();
    let dbStatus = false;
    
    if (config.database.enabled) {
      try {
        dbStatus = await testConnection();
      } catch {
        dbStatus = false;
      }
    }

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: config.database.enabled ? (dbStatus ? 'connected' : 'disconnected') : 'disabled',
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

      // Run assessment
      const { runAssessment } = await import('../assessment/engine');
      const assessmentContext = {
        repoPath: analysis.localPath,
        fileTree: analysis.fileTree,
        parsedFiles: [],
        dependencyGraph: undefined,
        lineageGraph: undefined,
      };
      const assessment = await runAssessment(assessmentContext);

      // Build lineage graph
      const { buildLineageGraph } = await import('../lineage/graph-builder');
      const graphContext = {
        components: [],
        apiCalls: [],
        endpoints: [],
        queries: [],
        tables: [],
      };
      const graph = buildLineageGraph(graphContext);

      const result = {
        success: true,
        repository: `${owner}/${repoName}`,
        techStack: techStack,
        assessment: assessment,
        lineage: {
          nodes: graph.nodes.length,
          edges: graph.edges.length,
        },
      };

      // Save to database if enabled
      await saveAnalysisResult({
        repository: `${owner}/${repoName}`,
        repositoryUrl: `https://github.com/${owner}/${repoName}`,
        techStack,
        assessmentResult: assessment,
        lineageGraph: graph,
      });

      res.json(result);
    } catch (error: any) {
      logger.error('Analysis failed', { error: error.message, stack: error.stack });
      
      // Save error to database
      if (req.body.repo) {
        await saveAnalysisError(
          req.body.repo,
          error.message,
          `https://github.com/${req.body.repo}`
        );
      }
      
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
      const { repository, changeRequest } = req.body;

      if (!repository || !changeRequest) {
        return res.status(400).json({ error: 'Repository and changeRequest required' });
      }

      const parsedChange = parseChangeRequest(changeRequest.description || changeRequest);
      const { analyzeChangeImpact } = await import('../impact/analyzer');
      
      // Would need lineage graph here - simplified for now
      const impactContext = {
        changeRequest: parsedChange,
        lineageGraph: { nodes: [], edges: [], layers: { frontend: [], backend: [], database: [] }, metadata: {} as any },
        endpoints: [],
        queries: [],
        components: [],
      };

      const impact = analyzeChangeImpact(impactContext);

      res.json({
        success: true,
        repository,
        changeRequest: parsedChange,
        impact,
      });
    } catch (error: any) {
      logger.error('Impact analysis failed', { error: error.message, stack: error.stack });
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

  // Get analysis results endpoint
  app.get('/api/results', async (req, res) => {
    try {
      const { listAnalysisResults } = await import('../database');
      const { repository, limit, offset, status } = req.query;

      const results = await listAnalysisResults({
        repository: repository as string,
        limit: limit ? parseInt(limit as string, 10) : undefined,
        offset: offset ? parseInt(offset as string, 10) : undefined,
        status: status as string,
      });

      res.json({
        success: true,
        results,
        count: results.length,
      });
    } catch (error: any) {
      logger.error('Failed to fetch results', { error: error.message });
      const formattedError = formatError(error);
      res.status(formattedError.statusCode).json({
        error: formattedError.message,
        code: formattedError.code,
      });
    }
  });

  // Get analysis result by ID
  app.get('/api/results/:id', async (req, res) => {
    try {
      const { getAnalysisResultById } = await import('../database');
      const id = parseInt(req.params.id, 10);

      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid result ID' });
      }

      const result = await getAnalysisResultById(id);

      if (!result) {
        return res.status(404).json({ error: 'Analysis result not found' });
      }

      res.json({
        success: true,
        result,
      });
    } catch (error: any) {
      logger.error('Failed to fetch result', { error: error.message });
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
export function startServer(options: ServerOptions = {}): void {
  const app = createServer(options);
  const config = loadConfig();
  const port = options.port || config.server.port;
  const host = options.host || config.server.host;

  app.listen(port, host, () => {
    logger.info(`Code Assessment API server running on ${host}:${port}`);
  });
}

/**
 * Parse repository string
 */
function parseRepo(repo: string): [string, string] {
  // Handle both formats: "owner/repo" or "https://github.com/owner/repo"
  const githubMatch = repo.match(/github\.com[/:]([^/]+)\/([^/]+)/);
  if (githubMatch) {
    return [githubMatch[1], githubMatch[2].replace(/\.git$/, '')];
  }

  const parts = repo.split('/');
  if (parts.length !== 2) {
    throw new Error('Invalid repository format. Use "owner/repo" or full GitHub URL');
  }

  return [parts[0], parts[1].replace(/\.git$/, '')];
}
