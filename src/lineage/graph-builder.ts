/**
 * Unified lineage graph builder
 */

import {
  LineageGraph,
  LineageNode,
  LineageEdge,
  GraphMetadata,
  LineageNodeType,
  LineageEdgeType,
} from '../types';
import { Component, APICall } from '../types';
import { Endpoint } from '../types';
import { DatabaseQuery, Table } from '../types';
import {
  ConnectionMatch,
  createFrontendBackendEdges,
} from './connectors/frontend-backend';
import {
  BackendDatabaseMatch,
  createBackendDatabaseEdges,
} from './connectors/backend-database';

export interface LineageGraphContext {
  // Frontend
  components: Component[];
  apiCalls: APICall[];

  // Backend
  endpoints: Endpoint[];
  queries: DatabaseQuery[];

  // Database
  tables: Table[];
}

/**
 * Build complete lineage graph from frontend → backend → database
 */
export function buildLineageGraph(context: LineageGraphContext): LineageGraph {
  const nodes: LineageNode[] = [];
  const edges: LineageEdge[] = [];

  // Create frontend nodes
  for (const component of context.components) {
    nodes.push({
      id: `component:${component.file}:${component.name}`,
      type: 'component',
      layer: 'frontend',
      label: component.name,
      file: component.file,
      line: component.line,
      data: {
        componentName: component.name,
        props: component.props,
      },
    });
  }

  for (const call of context.apiCalls) {
    nodes.push({
      id: `api-call:${call.id}`,
      type: 'api-call',
      layer: 'frontend',
      label: `${call.method} ${call.url || call.urlPattern || 'dynamic'}`,
      file: call.file,
      line: call.line,
      data: {
        method: call.method,
        url: call.url || call.urlPattern,
      },
    });
  }

  // Create backend nodes
  for (const endpoint of context.endpoints) {
    nodes.push({
      id: `endpoint:${endpoint.id}`,
      type: 'endpoint',
      layer: 'backend',
      label: `${endpoint.method} ${endpoint.path}`,
      file: endpoint.file,
      line: endpoint.line,
      data: {
        httpMethod: endpoint.method,
        path: endpoint.path,
        parameters: endpoint.parameters.map((p) => p.name),
      },
    });
  }

  for (const query of context.queries) {
    nodes.push({
      id: `query:${query.id}`,
      type: 'database-query',
      layer: 'backend',
      label: `${query.type} ${query.table || 'query'}`,
      file: query.file,
      line: query.line,
      data: {
        queryType: query.type,
        table: query.table,
        ormMethod: query.ormMethod,
      },
    });
  }

  // Create database nodes
  for (const table of context.tables) {
    nodes.push({
      id: `table:${table.name}`,
      type: 'table',
      layer: 'database',
      label: table.name,
      file: '', // Tables don't have file paths
      data: {
        tableName: table.name,
        columns: table.columns.map((c) => c.name),
      },
    });
  }

  // Connect frontend to backend (API calls → endpoints)
  // This would be done by calling connectFrontendToBackend and creating edges
  // For now, we'll add placeholder logic

  // Connect backend to database (queries → tables)
  const backendDbMatches = connectBackendToDatabaseStub(context.endpoints, context.queries);
  const backendDbEdges = createBackendDatabaseEdges(backendDbMatches);
  edges.push(...backendDbEdges);

  // Connect queries to tables
  const queryTableEdges = connectQueriesToTables(context.queries, context.tables);
  edges.push(...queryTableEdges);

  // Separate nodes by layer
  const frontendNodes = nodes.filter((n) => n.layer === 'frontend');
  const backendNodes = nodes.filter((n) => n.layer === 'backend');
  const databaseNodes = nodes.filter((n) => n.layer === 'database');

  // Calculate metadata
  const metadata = calculateGraphMetadata(nodes, edges);

  return {
    nodes,
    edges,
    layers: {
      frontend: frontendNodes,
      backend: backendNodes,
      database: databaseNodes,
    },
    metadata,
  };
}

/**
 * Connect queries to tables (simplified - full version in connectors)
 */
function connectBackendToDatabaseStub(
  endpoints: Endpoint[],
  queries: DatabaseQuery[]
): BackendDatabaseMatch[] {
  const matches: BackendDatabaseMatch[] = [];

  for (const endpoint of endpoints) {
    const fileQueries = queries.filter((q) => q.file === endpoint.file);
    for (const query of fileQueries) {
      matches.push({
        endpoint,
        query,
        confidence: 0.8,
        reason: 'Same file',
      });
    }
  }

  return matches;
}

/**
 * Connect queries to tables
 */
function connectQueriesToTables(
  queries: DatabaseQuery[],
  tables: Table[]
): LineageEdge[] {
  const edges: LineageEdge[] = [];
  const tableNames = new Set(tables.map((t) => t.name.toLowerCase()));

  for (const query of queries) {
    if (query.table) {
      const tableName = query.table.toLowerCase();
      if (tableNames.has(tableName)) {
        edges.push({
          id: `edge:query:${query.id}-table:${tableName}`,
          from: `query:${query.id}`,
          to: `table:${tableName}`,
          type: 'database-query',
          label: `${query.type} ${tableName}`,
          confidence: 1.0,
          data: {
            queryType: query.type,
            table: tableName,
          },
        });
      }
    }

    // Handle queries with multiple tables
    if (query.tables && query.tables.length > 0) {
      for (const tableName of query.tables) {
        const normalizedName = tableName.toLowerCase();
        if (tableNames.has(normalizedName)) {
          edges.push({
            id: `edge:query:${query.id}-table:${normalizedName}`,
            from: `query:${query.id}`,
            to: `table:${normalizedName}`,
            type: 'database-query',
            label: `${query.type} ${normalizedName}`,
            confidence: 1.0,
            data: {
              queryType: query.type,
              table: normalizedName,
            },
          });
        }
      }
    }
  }

  return edges;
}

/**
 * Calculate graph metadata
 */
function calculateGraphMetadata(
  nodes: LineageNode[],
  edges: LineageEdge[]
): GraphMetadata {
  // Count nodes by type
  const nodeCounts = {} as Record<LineageNodeType, number>;
  const edgeCounts = {} as Record<LineageEdgeType, number>;

  // Initialize counts
  const nodeTypes: LineageNodeType[] = [
    'component',
    'page',
    'api-call',
    'endpoint',
    'service',
    'controller',
    'database-query',
    'table',
    'schema',
  ];
  const edgeTypes: LineageEdgeType[] = [
    'api-call',
    'database-query',
    'data-flow',
    'navigation',
    'dependency',
  ];

  for (const type of nodeTypes) {
    nodeCounts[type] = 0;
  }
  for (const type of edgeTypes) {
    edgeCounts[type] = 0;
  }

  // Count nodes
  for (const node of nodes) {
    nodeCounts[node.type] = (nodeCounts[node.type] || 0) + 1;
  }

  // Count edges
  for (const edge of edges) {
    edgeCounts[edge.type] = (edgeCounts[edge.type] || 0) + 1;
  }

  // Calculate confidence statistics
  const confidences = edges.map((e) => e.confidence);
  const avgConfidence =
    confidences.length > 0
      ? confidences.reduce((sum, c) => sum + c, 0) / confidences.length
      : 0;
  const minConfidence = confidences.length > 0 ? Math.min(...confidences) : 0;
  const maxConfidence = confidences.length > 0 ? Math.max(...confidences) : 0;

  // Build confidence distribution (histogram)
  const distribution = [0, 0, 0, 0, 0]; // 5 buckets: 0-0.2, 0.2-0.4, 0.4-0.6, 0.6-0.8, 0.8-1.0
  for (const conf of confidences) {
    const bucket = Math.min(4, Math.floor(conf * 5));
    distribution[bucket]++;
  }

  // Calculate disconnected components (simplified)
  const disconnectedComponents = calculateDisconnectedComponents(nodes, edges);

  // Calculate longest path (simplified - DFS)
  const longestPath = calculateLongestPath(nodes, edges);

  return {
    totalNodes: nodes.length,
    totalEdges: edges.length,
    nodeCounts,
    edgeCounts,
    confidence: {
      average: avgConfidence,
      min: minConfidence,
      max: maxConfidence,
      distribution,
    },
    disconnectedComponents,
    longestPath,
  };
}

/**
 * Calculate disconnected components
 */
function calculateDisconnectedComponents(
  nodes: LineageNode[],
  edges: LineageEdge[]
): number {
  const visited = new Set<string>();
  let components = 0;

  function dfs(nodeId: string): void {
    if (visited.has(nodeId)) {
      return;
    }
    visited.add(nodeId);

    // Visit all neighbors
    const outgoing = edges.filter((e) => e.from === nodeId);
    const incoming = edges.filter((e) => e.to === nodeId);

    for (const edge of outgoing) {
      dfs(edge.to);
    }
    for (const edge of incoming) {
      dfs(edge.from);
    }
  }

  for (const node of nodes) {
    if (!visited.has(node.id)) {
      dfs(node.id);
      components++;
    }
  }

  return components;
}

/**
 * Calculate longest path in graph
 */
function calculateLongestPath(
  nodes: LineageNode[],
  edges: LineageEdge[]
): number {
  let maxPath = 0;

  for (const startNode of nodes) {
    const pathLength = dfsLongestPath(startNode.id, edges, new Set<string>());
    maxPath = Math.max(maxPath, pathLength);
  }

  return maxPath;
}

/**
 * DFS to find longest path from a node
 */
function dfsLongestPath(
  nodeId: string,
  edges: LineageEdge[],
  visited: Set<string>
): number {
  if (visited.has(nodeId)) {
    return 0; // Cycle detected
  }

  visited.add(nodeId);
  let maxPath = 0;

  const outgoing = edges.filter((e) => e.from === nodeId);
  for (const edge of outgoing) {
    const pathLength = 1 + dfsLongestPath(edge.to, edges, new Set(visited));
    maxPath = Math.max(maxPath, pathLength);
  }

  return maxPath;
}

/**
 * Connect frontend API calls to backend endpoints
 */
export function connectFrontendBackendInGraph(
  apiCalls: APICall[],
  endpoints: Endpoint[]
): LineageEdge[] {
  // Import from connector module (will be called from outside)
  // This is a wrapper function
  const matches: ConnectionMatch[] = [];

  // Simple matching logic (full implementation in connector)
  for (const call of apiCalls) {
    for (const endpoint of endpoints) {
      if (call.method === endpoint.method) {
        // Check URL/path matching
        const callPath = call.url || call.urlPattern || '';
        const endpointPath = endpoint.path;

        if (callPath.includes(endpointPath) || endpointPath.includes(callPath)) {
          matches.push({
            frontendCall: call,
            backendEndpoint: endpoint,
            confidence: 0.7,
            reasons: ['Method and path match'],
          });
        }
      }
    }
  }

  return createFrontendBackendEdges(matches);
}

