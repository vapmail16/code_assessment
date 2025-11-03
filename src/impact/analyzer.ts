/**
 * Change impact analyzer
 */

import { ChangeRequest, ImpactAnalysis, BreakingChange, AffectedNode } from '../types';
import { LineageGraph, DependencyGraph } from '../types';
import { Endpoint, DatabaseQuery } from '../types';
import { Component } from '../types';
import { extractChangeDetails } from './change-parser';
import { addTestCoverageToImpact, addTestRecommendations } from './test-coverage';

export interface ImpactAnalysisContext {
  changeRequest: ChangeRequest;
  lineageGraph: LineageGraph;
  dependencyGraph?: DependencyGraph;
  endpoints: Endpoint[];
  queries: DatabaseQuery[];
  components: Component[];
  testFiles?: any[]; // TestFile[] - use any to avoid circular dependency
  fileTree?: any; // FileTree
}

/**
 * Analyze impact of a change request
 */
export function analyzeChangeImpact(
  context: ImpactAnalysisContext
): ImpactAnalysis {
  const { changeRequest, lineageGraph } = context;

  // Extract change details
  const details = extractChangeDetails(changeRequest);

  // Find affected nodes in lineage graph
  const affectedNodeIds = findAffectedNodes(context, details);

  // Convert to AffectedNode format
  const affectedNodes = convertToAffectedNodes(affectedNodeIds, lineageGraph, context);

  // Find affected files
  const affectedFiles = extractAffectedFiles(affectedNodeIds, lineageGraph);

  // Detect breaking changes (pass node IDs)
  const breakingChanges = detectBreakingChanges(context, affectedNodeIds, details);

  // Calculate impact metrics
  const summary = calculateImpactSummary(
    affectedFiles,
    affectedNodes, // Now it's AffectedNode[], not string[]
    breakingChanges,
    context
  );

  // Generate recommendations
  let recommendations = generateRecommendations(
    context,
    affectedNodes,
    breakingChanges
  );

  // Build dependency chain (simplified)
  const dependencyChain = {
    chains: [],
    maxDepth: 3,
    totalAffected: affectedNodes.length,
  };

  const result: ImpactAnalysis = {
    repository: context.lineageGraph.metadata ? '' : '', // Will be set by caller
    timestamp: new Date(),
    changeRequest,
    affectedFiles: Array.from(new Set(affectedFiles)),
    affectedNodes,
    dependencyChain,
    breakingChanges,
    recommendations,
    summary,
  };

  // Add test coverage recommendations if test files are provided
  if (context.testFiles && context.testFiles.length > 0) {
    const testImpact = addTestCoverageToImpact(
      result as any,
      context.testFiles,
      context.fileTree || { files: new Map(), directories: new Map() }
    );
    const testRecommendations = addTestRecommendations(
      result as any,
      testImpact.affectedTests
    );
    result.recommendations = [...recommendations, ...testRecommendations];
  }

  return result;
}

/**
 * Convert node IDs to AffectedNode format
 */
function convertToAffectedNodes(
  nodeIds: string[],
  graph: LineageGraph,
  context: ImpactAnalysisContext
): AffectedNode[] {
  const affectedNodes: AffectedNode[] = [];

  for (const nodeId of nodeIds) {
    const node = graph.nodes.find((n) => n.id === nodeId);
    if (node) {
      affectedNodes.push({
        nodeId: node.id,
        nodeType: node.type,
        file: node.file || '',
        layer: node.layer || 'backend',
        impactType: 'indirect', // Could be enhanced to detect direct vs indirect
        impactReason: `Connected to changed component`,
        severity: 'medium',
        depth: 1, // Could calculate actual depth
      });
    }
  }

  return affectedNodes;
}

/**
 * Find affected nodes in graph
 */
function findAffectedNodes(
  context: ImpactAnalysisContext,
  details: ReturnType<typeof extractChangeDetails>
): string[] {
  const affectedNodes = new Set<string>();
  const { lineageGraph, endpoints, queries, components } = context;

  // Find nodes by type
  switch (context.changeRequest.type) {
    case 'modify-api':
      // Find endpoint nodes and all connected nodes
      if (details.targetEndpoints) {
        for (const endpointPattern of details.targetEndpoints) {
          const endpointNodes = findNodesByPattern(lineageGraph, `endpoint:`, endpointPattern);
          endpointNodes.forEach((nodeId) => {
            affectedNodes.add(nodeId);
            // Add all nodes connected to this endpoint
            addConnectedNodes(lineageGraph, nodeId, affectedNodes);
          });
        }
      } else {
        // Find all endpoints (general endpoint change)
        lineageGraph.nodes
          .filter((n) => n.type === 'endpoint')
          .forEach((n) => {
            affectedNodes.add(n.id);
            addConnectedNodes(lineageGraph, n.id, affectedNodes);
          });
      }
      break;

    // These cases are handled above, remove duplicate cases

    case 'other':
    default:
      // Find by file path
      if (details.targetFiles) {
        for (const filePath of details.targetFiles) {
          const fileNodes = lineageGraph.nodes.filter((n) => n.file === filePath);
          fileNodes.forEach((n) => {
            affectedNodes.add(n.id);
            addConnectedNodes(lineageGraph, n.id, affectedNodes);
          });
        }
      } else {
        // Affects everything (very broad change)
        lineageGraph.nodes.forEach((n) => affectedNodes.add(n.id));
      }
      break;
  }

  return Array.from(affectedNodes);
}

/**
 * Find nodes by pattern
 */
function findNodesByPattern(
  graph: LineageGraph,
  prefix: string,
  pattern: string
): string[] {
  const nodeIds: string[] = [];

  for (const node of graph.nodes) {
    if (node.id.startsWith(prefix)) {
      // Check if pattern matches node label or file
      if (
        node.label.toLowerCase().includes(pattern.toLowerCase()) ||
        node.file.toLowerCase().includes(pattern.toLowerCase())
      ) {
        nodeIds.push(node.id);
      }
    }
  }

  return nodeIds;
}

/**
 * Add connected nodes (follow edges)
 */
function addConnectedNodes(
  graph: LineageGraph,
  nodeId: string,
  visited: Set<string>,
  depth = 0,
  maxDepth = 3
): void {
  if (depth > maxDepth || visited.has(nodeId)) {
    return;
  }

  visited.add(nodeId);

  // Find outgoing edges
  const outgoing = graph.edges.filter((e) => e.from === nodeId);
  for (const edge of outgoing) {
    addConnectedNodes(graph, edge.to, visited, depth + 1, maxDepth);
  }

  // Find incoming edges (for some change types, we care about reverse impact)
  const incoming = graph.edges.filter((e) => e.to === nodeId);
  for (const edge of incoming) {
    addConnectedNodes(graph, edge.from, visited, depth + 1, maxDepth);
  }
}

/**
 * Extract affected files from nodes
 */
function extractAffectedFiles(nodeIds: string[], graph: LineageGraph): string[] {
  const files = new Set<string>();

  for (const nodeId of nodeIds) {
    const node = graph.nodes.find((n) => n.id === nodeId);
    if (node && node.file) {
      files.add(node.file);
    }
  }

  return Array.from(files);
}

/**
 * Detect breaking changes
 */
function detectBreakingChanges(
  context: ImpactAnalysisContext,
  affectedNodes: string[],
  details: ReturnType<typeof extractChangeDetails>
): BreakingChange[] {
  const breakingChanges: BreakingChange[] = [];
  const { changeRequest, endpoints, queries } = context;

  switch (changeRequest.type) {
    case 'modify-api':
      // Check for endpoint signature changes
      for (const endpointPattern of details.targetEndpoints || []) {
        const endpoint = endpoints.find((e) => e.path.includes(endpointPattern));
        if (endpoint) {
    breakingChanges.push({
      id: `breaking-endpoint-${endpoint.id}`,
      type: 'api-response-changed',
      severity: 'high',
      description: `Endpoint ${endpoint.method} ${endpoint.path} will be modified`,
      affectedNode: `endpoint:${endpoint.id}`,
      file: endpoint.file,
      line: endpoint.line,
      impact: 'Clients using this endpoint may break if request/response format changes',
      migrationPath: 'Update API clients to match new endpoint signature',
    });
        }
      }
      break;

    case 'modify-schema':
      // Check for database schema breaking changes
      for (const tableName of details.targetTables || []) {
        const tableQueries = queries.filter((q) => q.table === tableName);
        if (tableQueries.length > 0) {
      breakingChanges.push({
        id: `breaking-schema-${tableName}`,
        type: 'schema-column-removed',
        severity: 'high',
        description: `Schema change for table ${tableName} will affect ${tableQueries.length} queries`,
        affectedNode: `table:${tableName}`,
        file: tableQueries[0].file,
        impact: 'Database migrations required, queries may need updates',
        migrationPath: 'Create migration script and update all affected queries',
      });
        }
      }
      break;

    case 'modify-feature':
      // Component props changes are breaking (if component-specific)
      if (context.changeRequest.targetComponents && context.changeRequest.targetComponents.length > 0) {
        breakingChanges.push({
        id: `breaking-component-${changeRequest.id}`,
        type: 'type-incompatibility',
        severity: 'medium',
        description: 'Component change may break parent components using it',
        affectedNode: `component-${changeRequest.id}`,
        file: '',
        impact: 'Parent components passing props may need updates',
        migrationPath: 'Update all parent components to match new component interface',
        });
      }
      break;
  }

  return breakingChanges;
}

/**
 * Calculate impact summary
 */
function calculateImpactSummary(
  affectedFiles: string[],
  affectedNodes: AffectedNode[],
  breakingChanges: BreakingChange[],
  context: ImpactAnalysisContext
): ImpactAnalysis['summary'] {
  // Estimate complexity based on affected scope
  let complexity: 'low' | 'medium' | 'high' = 'low';
  if (affectedFiles.length > 20 || affectedNodes.length > 50) {
    complexity = 'high';
  } else if (affectedFiles.length > 5 || affectedNodes.length > 10) {
    complexity = 'medium';
  }

  // Estimate time (simplified)
  let estimatedTime: number | undefined;
  const baseTimePerFile = 2; // hours
  const breakingChangePenalty = breakingChanges.length * 4; // hours per breaking change
  estimatedTime = affectedFiles.length * baseTimePerFile + breakingChangePenalty;

  // Calculate impact distribution
  const criticalImpact = affectedNodes.filter((n) => n.severity === 'critical').length;
  const highImpact = affectedNodes.filter((n) => n.severity === 'high').length;
  const mediumImpact = affectedNodes.filter((n) => n.severity === 'medium').length;
  const lowImpact = affectedNodes.filter((n) => n.severity === 'low').length;

  // Ensure all recommendation types are valid

  return {
    totalAffectedFiles: affectedFiles.length,
    totalAffectedNodes: affectedNodes.length,
    criticalImpact,
    highImpact,
    mediumImpact,
    lowImpact,
    breakingChangesCount: breakingChanges.length,
    estimatedComplexity: complexity,
    estimatedTime,
  };
}

/**
 * Generate recommendations
 */
function generateRecommendations(
  context: ImpactAnalysisContext,
  affectedNodes: AffectedNode[],
  breakingChanges: BreakingChange[]
): ImpactAnalysis['recommendations'] {
  const recommendations: ImpactAnalysis['recommendations'] = [];

  if (breakingChanges.length > 0) {
    recommendations.push({
      id: 'breaking-changes-review',
      priority: 'high' as const,
      type: 'review-required' as const,
      title: 'Review Breaking Changes',
      description: `${breakingChanges.length} breaking changes detected. Ensure backward compatibility or version APIs appropriately.`,
      affectedFiles: breakingChanges.map((bc) => bc.file),
      suggestedChanges: [],
      relatedFiles: [],
    });

    recommendations.push({
      id: 'migration-plan',
      priority: 'high' as const,
      type: 'migration' as const,
      title: 'Create Migration Plan',
      description: 'Plan migration strategy for affected systems and clients.',
      affectedFiles: [],
      suggestedChanges: [],
      relatedFiles: [],
    });
  }

  if (affectedNodes.length > 30) {
    recommendations.push({
      id: 'large-impact-warning',
      priority: 'medium' as const,
      type: 'refactor' as const,
      title: 'Large Impact Change',
      description: `This change affects ${affectedNodes.length} nodes. Consider breaking into smaller changes.`,
      affectedFiles: [],
      suggestedChanges: [],
      relatedFiles: [],
    });
  }

  if (context.changeRequest.type === 'modify-schema') {
    recommendations.push({
      id: 'backup-database',
      priority: 'high' as const,
      type: 'migration' as const,
      title: 'Database Backup Required',
      description: 'Ensure database backup is created before schema changes.',
      affectedFiles: [],
      suggestedChanges: [],
      relatedFiles: [],
    });
  }

  return recommendations;
}

