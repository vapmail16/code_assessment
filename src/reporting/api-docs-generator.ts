/**
 * Automated API documentation generator
 */

import { Express } from 'express';
import * as fs from 'fs';
import * as path from 'path';

export interface APIRoute {
  method: string;
  path: string;
  description?: string;
  parameters?: Array<{
    name: string;
    type: string;
    required: boolean;
    description?: string;
  }>;
  requestBody?: {
    schema: Record<string, any>;
    examples?: Array<{ name: string; value: any }>;
  };
  responses?: Array<{
    status: number;
    description: string;
    schema?: Record<string, any>;
    examples?: Array<{ name: string; value: any }>;
  }>;
}

/**
 * Generate OpenAPI/Swagger documentation from Express routes
 */
export function generateAPIDocumentation(routes: APIRoute[]): string {
  const lines: string[] = [];

  lines.push('# API Documentation');
  lines.push('');
  lines.push(`**Generated**: ${new Date().toISOString()}`);
  lines.push('');
  lines.push('## Endpoints');
  lines.push('');

  for (const route of routes) {
    const method = route.method.toUpperCase();
    const path = route.path;
    const title = `${method} ${path}`;

    lines.push(`### ${title}`);
    lines.push('');

    if (route.description) {
      lines.push(route.description);
      lines.push('');
    }

    // Parameters
    if (route.parameters && route.parameters.length > 0) {
      lines.push('**Parameters**:');
      lines.push('');
      lines.push('| Name | Type | Required | Description |');
      lines.push('|------|------|----------|-------------|');
      for (const param of route.parameters) {
        lines.push(
          `| ${param.name} | ${param.type} | ${param.required ? 'Yes' : 'No'} | ${param.description || ''} |`
        );
      }
      lines.push('');
    }

    // Request Body
    if (route.requestBody) {
      lines.push('**Request Body**:');
      lines.push('');
      lines.push('```json');
      lines.push(JSON.stringify(route.requestBody.schema, null, 2));
      lines.push('```');
      lines.push('');

      if (route.requestBody.examples) {
        for (const example of route.requestBody.examples) {
          lines.push(`**Example: ${example.name}**`);
          lines.push('');
          lines.push('```json');
          lines.push(JSON.stringify(example.value, null, 2));
          lines.push('```');
          lines.push('');
        }
      }
    }

    // Responses
    if (route.responses && route.responses.length > 0) {
      lines.push('**Responses**:');
      lines.push('');
      for (const response of route.responses) {
        lines.push(`#### ${response.status} ${response.description}`);
        lines.push('');
        if (response.schema) {
          lines.push('```json');
          lines.push(JSON.stringify(response.schema, null, 2));
          lines.push('```');
          lines.push('');
        }
        if (response.examples) {
          for (const example of response.examples) {
            lines.push(`**Example: ${example.name}**`);
            lines.push('');
            lines.push('```json');
            lines.push(JSON.stringify(example.value, null, 2));
            lines.push('```');
            lines.push('');
          }
        }
      }
    }

    lines.push('---');
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Extract routes from Express app (simplified)
 */
export function extractRoutesFromApp(app: Express): APIRoute[] {
  const routes: APIRoute[] = [];

  // Hardcoded routes based on our API structure
  routes.push({
    method: 'GET',
    path: '/health',
    description: 'Health check endpoint',
    responses: [
      {
        status: 200,
        description: 'Service is healthy',
        schema: {
          status: 'string',
          timestamp: 'string',
        },
        examples: [
          {
            name: 'Success',
            value: {
              status: 'ok',
              timestamp: '2024-01-15T10:30:00.000Z',
            },
          },
        ],
      },
    ],
  });

  routes.push({
    method: 'POST',
    path: '/api/analyze',
    description: 'Analyze a GitHub repository',
    requestBody: {
      schema: {
        repository: 'string',
        options: {
          includeSecurity: 'boolean',
          includeQuality: 'boolean',
          includeArchitecture: 'boolean',
          buildLineage: 'boolean',
        },
      },
      examples: [
        {
          name: 'Basic Analysis',
          value: {
            repository: 'owner/repo',
            options: {
              includeSecurity: true,
              includeQuality: true,
              includeArchitecture: true,
              buildLineage: true,
            },
          },
        },
      ],
    },
    responses: [
      {
        status: 200,
        description: 'Analysis completed successfully',
        schema: {
          success: 'boolean',
          repository: 'string',
          techStack: {},
          assessment: {},
          lineage: {},
        },
      },
      {
        status: 400,
        description: 'Invalid request',
      },
      {
        status: 500,
        description: 'Analysis failed',
      },
    ],
  });

  routes.push({
    method: 'POST',
    path: '/api/impact',
    description: 'Analyze impact of a proposed change',
    requestBody: {
      schema: {
        repository: 'string',
        changeRequest: {
          type: 'string',
          description: 'string',
        },
      },
    },
    responses: [
      {
        status: 200,
        description: 'Impact analysis completed',
      },
    ],
  });

  routes.push({
    method: 'POST',
    path: '/api/export',
    description: 'Export lineage graph',
    requestBody: {
      schema: {
        graph: {},
        format: 'string',
      },
    },
    responses: [
      {
        status: 200,
        description: 'Graph exported successfully',
      },
    ],
  });

  return routes;
}

/**
 * Generate and save API documentation
 */
export function generateAndSaveAPIDocs(
  outputPath: string,
  routes?: APIRoute[]
): void {
  const apiRoutes = routes || extractRoutesFromApp({} as Express);
  const docs = generateAPIDocumentation(apiRoutes);

  // Ensure output directory exists
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(outputPath, docs, 'utf-8');
}

