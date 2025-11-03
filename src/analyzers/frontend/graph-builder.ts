/**
 * Frontend dependency graph builder
 */

import { DependencyGraph, GraphNode, GraphEdge } from '../../types';
import { ParsedFile } from '../../types';
import * as path from 'path';

export interface FrontendGraphContext {
  files: Map<string, ParsedFile>;
}

/**
 * Build dependency graph from parsed frontend files
 */
export function buildFrontendDependencyGraph(
  context: FrontendGraphContext
): DependencyGraph {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  // Create nodes for all files
  const fileNodeMap = new Map<string, string>(); // file path -> node id

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
        complexity: parsedFile.complexity,
      },
    });

    // Create nodes for exports
    for (const exp of parsedFile.exports) {
      const exportNodeId = `export:${filePath}:${exp.name}`;
      nodes.push({
        id: exportNodeId,
        type: 'module',
        name: exp.name,
        file: filePath,
        line: exp.line,
        metadata: {
          exportType: exp.type,
        },
      });
    }

    // Create nodes for functions/components
    for (const func of parsedFile.functions || []) {
      const funcNodeId = `function:${filePath}:${func.name}`;
      nodes.push({
        id: funcNodeId,
        type: 'function',
        name: func.name,
        file: filePath,
        line: func.line,
        metadata: {
          parameters: func.parameters,
        },
      });
    }
  }

  // Create edges for imports
  for (const [filePath, parsedFile] of context.files) {
    const sourceNodeId = fileNodeMap.get(filePath);
    if (!sourceNodeId) continue;

    for (const imp of parsedFile.imports) {
      // Try to resolve the import to a file
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
              defaultImport: imp.default,
              namedImports: imp.named,
            },
          });

          // If there's a named import matching an export, create edge to that export
          if (imp.named && imp.named.length > 0) {
            for (const namedImp of imp.named) {
              const exportNode = findExportNode(targetFile, namedImp);
              if (exportNode) {
                edges.push({
                  from: sourceNodeId,
                  to: exportNode,
                  type: 'import',
                  metadata: {
                    importedName: namedImp,
                  },
                });
              }
            }
          }

          // If there's a default import
          if (imp.default) {
            const defaultExportNode = findDefaultExportNode(targetFile);
            if (defaultExportNode) {
              edges.push({
                from: sourceNodeId,
                to: defaultExportNode,
                type: 'import',
                metadata: {
                  importedName: imp.default,
                },
              });
            }
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
 * Resolve import path to actual file
 */
function resolveImport(
  importPath: string,
  fromFile: string,
  files: Map<string, ParsedFile>
): ParsedFile | null {
  // Remove query strings and hashes
  const cleanPath = importPath.split('?')[0].split('#')[0];

  // Skip node_modules imports
  if (cleanPath.startsWith('.') || cleanPath.startsWith('/')) {
    // Relative import
    const dir = path.dirname(fromFile);
    const resolvedPath = path.resolve(dir, cleanPath);

    // Try different extensions
    const extensions = ['', '.ts', '.tsx', '.js', '.jsx', '.json'];
    for (const ext of extensions) {
      const fullPath = resolvedPath + ext;
      if (files.has(fullPath)) {
        return files.get(fullPath)!;
      }

      // Try index files
      const indexPath = path.join(resolvedPath, 'index' + ext);
      if (files.has(indexPath)) {
        return files.get(indexPath)!;
      }
    }
  }

  return null;
}

/**
 * Find export node ID for a named export
 */
function findExportNode(parsedFile: ParsedFile, exportName: string): string | null {
  const export_ = parsedFile.exports.find((e) => e.name === exportName && e.type === 'named');
  if (export_) {
    return `export:${parsedFile.path}:${exportName}`;
  }
  return null;
}

/**
 * Find default export node ID
 */
function findDefaultExportNode(parsedFile: ParsedFile): string | null {
  const defaultExport = parsedFile.exports.find((e) => e.type === 'default');
  if (defaultExport) {
    return `export:${parsedFile.path}:${defaultExport.name}`;
  }
  return null;
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

    const outgoingEdges = graph.edges.filter((e) => e.from === nodeId && e.type === 'import');
    for (const edge of outgoingEdges) {
      if (recursionStack.has(edge.to)) {
        // Found a cycle
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

