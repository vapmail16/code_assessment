/**
 * Backend dependency graph builder
 */

import { DependencyGraph, GraphNode, GraphEdge } from '../../types';
import { ParsedFile, Endpoint, Service, DatabaseQuery } from '../../types';
import * as path from 'path';

export interface BackendGraphContext {
  files: Map<string, ParsedFile>;
  endpoints: Endpoint[];
  services: Service[];
  queries: DatabaseQuery[];
}

/**
 * Build backend dependency graph
 */
export function buildBackendDependencyGraph(context: BackendGraphContext): DependencyGraph {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  // Create nodes for files
  const fileNodeMap = new Map<string, string>();

  for (const [filePath, parsedFile] of context.files) {
    const nodeId = `file:${filePath}`;
    fileNodeMap.set(filePath, nodeId);

    nodes.push({
      id: nodeId,
      type: 'file',
      name: path.basename(filePath),
      file: filePath,
      metadata: {
        language: parsedFile.language,
        linesOfCode: parsedFile.linesOfCode,
      },
    });
  }

  // Create nodes for endpoints
  for (const endpoint of context.endpoints) {
    const endpointNodeId = `endpoint:${endpoint.id}`;
    nodes.push({
      id: endpointNodeId,
      type: 'endpoint',
      name: `${endpoint.method} ${endpoint.path}`,
      file: endpoint.file,
      line: endpoint.line,
      metadata: {
        method: endpoint.method,
        path: endpoint.path,
        handler: endpoint.handler,
      },
    });

    // Link endpoint to file
    const fileNodeId = fileNodeMap.get(endpoint.file);
    if (fileNodeId) {
      edges.push({
        from: fileNodeId,
        to: endpointNodeId,
        type: 'uses',
        metadata: {},
      });
    }
  }

  // Create nodes for services
  for (const service of context.services) {
    const serviceNodeId = `service:${service.name}`;
    nodes.push({
      id: serviceNodeId,
      type: 'service',
      name: service.name,
      file: service.file,
      metadata: {
        methods: service.methods,
      },
    });

    // Link service to file
    const fileNodeId = fileNodeMap.get(service.file);
    if (fileNodeId) {
      edges.push({
        from: fileNodeId,
        to: serviceNodeId,
        type: 'uses',
        metadata: {},
      });
    }

    // Link service dependencies
    for (const dep of service.dependencies) {
      // Try to find the dependency file
      const depFile = findFileByImport(dep, service.file, context.files);
      if (depFile) {
        const depNodeId = fileNodeMap.get(depFile.path);
        if (depNodeId) {
          edges.push({
            from: serviceNodeId,
            to: depNodeId,
            type: 'import',
            metadata: { importPath: dep },
          });
        }
      }
    }
  }

  // Create nodes for database queries and link them
  for (const query of context.queries) {
    const queryNodeId = `query:${query.id}`;
    nodes.push({
      id: queryNodeId,
      type: 'module',
      name: `Query: ${query.ormMethod || 'raw'}`,
      file: query.file,
      line: query.line,
      metadata: {
        type: query.type,
        table: query.table,
        ormMethod: query.ormMethod,
      },
    });

    // Link query to file
    const fileNodeId = fileNodeMap.get(query.file);
    if (fileNodeId) {
      edges.push({
        from: fileNodeId,
        to: queryNodeId,
        type: 'uses',
        metadata: {},
      });
    }
  }

  // Create edges for imports between files
  for (const [filePath, parsedFile] of context.files) {
    const sourceNodeId = fileNodeMap.get(filePath);
    if (!sourceNodeId) continue;

    for (const imp of parsedFile.imports) {
      if (imp.from.startsWith('.') || imp.from.startsWith('/')) {
        // Local import
        const targetFile = resolveImport(imp.from, filePath, context.files);
        if (targetFile) {
          const targetNodeId = fileNodeMap.get(targetFile.path);
          if (targetNodeId) {
            edges.push({
              from: sourceNodeId,
              to: targetNodeId,
              type: 'import',
              metadata: {
                importSource: imp.from,
              },
            });
          }
        }
      }
    }
  }

  return {
    nodes,
    edges,
  };
}

/**
 * Resolve import path to file
 */
function resolveImport(
  importPath: string,
  fromFile: string,
  files: Map<string, ParsedFile>
): ParsedFile | null {
  const cleanPath = importPath.split('?')[0].split('#')[0];
  if (cleanPath.startsWith('.') || cleanPath.startsWith('/')) {
    const dir = path.dirname(fromFile);
    const resolvedPath = path.resolve(dir, cleanPath);

    const extensions = ['', '.ts', '.tsx', '.js', '.jsx', '.json'];
    for (const ext of extensions) {
      const fullPath = resolvedPath + ext;
      if (files.has(fullPath)) {
        return files.get(fullPath)!;
      }

      const indexPath = path.join(resolvedPath, 'index' + ext);
      if (files.has(indexPath)) {
        return files.get(indexPath)!;
      }
    }
  }

  return null;
}

/**
 * Find file by import path
 */
function findFileByImport(
  importPath: string,
  fromFile: string,
  files: Map<string, ParsedFile>
): ParsedFile | null {
  return resolveImport(importPath, fromFile, files);
}

/**
 * Detect circular dependencies
 */
export function detectCircularDependencies(graph: DependencyGraph): string[][] {
  const cycles: string[][] = [];
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function dfs(nodeId: string, path: string[]): void {
    visited.add(nodeId);
    recursionStack.add(nodeId);
    path.push(nodeId);

    const outgoingEdges = graph.edges.filter(
      (e) => e.from === nodeId && (e.type === 'import' || e.type === 'uses')
    );
    for (const edge of outgoingEdges) {
      if (recursionStack.has(edge.to)) {
        const cycleStart = path.indexOf(edge.to);
        if (cycleStart !== -1) {
          cycles.push([...path.slice(cycleStart), edge.to]);
        }
      } else if (!visited.has(edge.to)) {
        dfs(edge.to, [...path]);
      }
    }

    recursionStack.delete(nodeId);
  }

  for (const node of graph.nodes) {
    if (!visited.has(node.id)) {
      dfs(node.id, []);
    }
  }

  return cycles;
}

