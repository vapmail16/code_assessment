/**
 * Accuracy validation framework
 */

import { LineageGraph, LineageEdge } from '../types';
import { ImpactAnalysis, AffectedNode } from '../types';

export interface AccuracyMetrics {
  crossLayerTracing: {
    frontendToBackend: number; // 0-1
    backendToDatabase: number; // 0-1
    overall: number; // 0-1
  };
  impactAnalysis: {
    precision: number; // True positives / (True positives + False positives)
    recall: number; // True positives / (True positives + False negatives)
    f1Score: number;
  };
  totalValidations: number;
  passedValidations: number;
  failedValidations: number;
}

export interface ValidationTestCase {
  id: string;
  description: string;
  repository: string;
  expectedConnections: Array<{
    from: string;
    to: string;
    type: string;
    confidence?: number;
  }>;
  expectedImpact?: {
    change: string;
    affectedFiles: string[];
    breakingChanges: number;
  };
}

/**
 * Validate lineage graph accuracy
 */
export function validateLineageAccuracy(
  graph: LineageGraph,
  testCases: ValidationTestCase[]
): AccuracyMetrics {
  let correctConnections = 0;
  let totalExpectedConnections = 0;
  let frontendToBackendCorrect = 0;
  let frontendToBackendTotal = 0;
  let backendToDatabaseCorrect = 0;
  let backendToDatabaseTotal = 0;

  for (const testCase of testCases) {
    for (const expected of testCase.expectedConnections) {
      totalExpectedConnections++;

      // Find matching edge in graph
      const matchingEdge = graph.edges.find(
        (edge) =>
          (edge.from.includes(expected.from) || expected.from.includes(extractNodeId(edge.from))) &&
          (edge.to.includes(expected.to) || expected.to.includes(extractNodeId(edge.to))) &&
          edge.type === expected.type
      );

      if (matchingEdge) {
        correctConnections++;

      // Categorize by layer
      const fromLayer = graph.nodes.find((n) => n.id === matchingEdge.from)?.layer;
      const toLayer = graph.nodes.find((n) => n.id === matchingEdge.to)?.layer;

        if (fromLayer === 'frontend' && toLayer === 'backend') {
          frontendToBackendTotal++;
          if (
            matchingEdge.confidence &&
            (!expected.confidence || matchingEdge.confidence >= expected.confidence)
          ) {
            frontendToBackendCorrect++;
          }
        } else if (fromLayer === 'backend' && toLayer === 'database') {
          backendToDatabaseTotal++;
          if (
            matchingEdge.confidence &&
            (!expected.confidence || matchingEdge.confidence >= expected.confidence)
          ) {
            backendToDatabaseCorrect++;
          }
        }
      }
    }
  }

  const frontendToBackendAccuracy =
    frontendToBackendTotal > 0 ? frontendToBackendCorrect / frontendToBackendTotal : 0;
  const backendToDatabaseAccuracy =
    backendToDatabaseTotal > 0 ? backendToDatabaseCorrect / backendToDatabaseTotal : 0;
  const overallAccuracy =
    totalExpectedConnections > 0 ? correctConnections / totalExpectedConnections : 0;

  return {
    crossLayerTracing: {
      frontendToBackend: frontendToBackendAccuracy,
      backendToDatabase: backendToDatabaseAccuracy,
      overall: overallAccuracy,
    },
    impactAnalysis: {
      precision: 0, // Would need true/false positive tracking
      recall: 0,
      f1Score: 0,
    },
    totalValidations: testCases.length,
    passedValidations: correctConnections,
    failedValidations: totalExpectedConnections - correctConnections,
  };
}

/**
 * Validate impact analysis accuracy
 */
export function validateImpactAccuracy(
  impact: ImpactAnalysis,
  testCases: ValidationTestCase[]
): AccuracyMetrics['impactAnalysis'] {
  let truePositives = 0;
  let falsePositives = 0;
  let falseNegatives = 0;

  for (const testCase of testCases) {
    if (!testCase.expectedImpact) {
      continue;
    }

    const expectedFiles = new Set(testCase.expectedImpact.affectedFiles);
    const actualFiles = new Set(impact.affectedFiles);

    // True positives: files correctly identified as affected
    for (const file of actualFiles) {
      if (expectedFiles.has(file)) {
        truePositives++;
      } else {
        falsePositives++;
      }
    }

    // False negatives: files that should be affected but weren't identified
    for (const file of expectedFiles) {
      if (!actualFiles.has(file)) {
        falseNegatives++;
      }
    }
  }

  const precision = truePositives + falsePositives > 0
    ? truePositives / (truePositives + falsePositives)
    : 0;
  const recall = truePositives + falseNegatives > 0
    ? truePositives / (truePositives + falseNegatives)
    : 0;
  const f1Score = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

  return {
    precision,
    recall,
    f1Score,
  };
}

/**
 * Extract node ID from edge ID
 */
function extractNodeId(edgeId: string): string {
  // edge IDs are like "edge:fromNode-toNode", extract the node part
  const match = edgeId.match(/edge:([^-]+)-(.+)/);
  return match ? match[1] : edgeId;
}

/**
 * Create accuracy report
 */
export function generateAccuracyReport(
  metrics: AccuracyMetrics,
  testCases: ValidationTestCase[]
): string {
  const lines: string[] = [];

  lines.push('# Accuracy Validation Report');
  lines.push('');
  lines.push(`**Total Test Cases**: ${testCases.length}`);
  lines.push(`**Validations**: ${metrics.passedValidations} / ${metrics.totalValidations}`);
  lines.push('');

  lines.push('## Cross-Layer Tracing Accuracy');
  lines.push('');
  lines.push(`- **Frontend → Backend**: ${(metrics.crossLayerTracing.frontendToBackend * 100).toFixed(1)}%`);
  lines.push(`- **Backend → Database**: ${(metrics.crossLayerTracing.backendToDatabase * 100).toFixed(1)}%`);
  lines.push(`- **Overall**: ${(metrics.crossLayerTracing.overall * 100).toFixed(1)}%`);
  lines.push('');

  lines.push('## Impact Analysis Accuracy');
  lines.push('');
  lines.push(`- **Precision**: ${(metrics.impactAnalysis.precision * 100).toFixed(1)}%`);
  lines.push(`- **Recall**: ${(metrics.impactAnalysis.recall * 100).toFixed(1)}%`);
  lines.push(`- **F1 Score**: ${(metrics.impactAnalysis.f1Score * 100).toFixed(1)}%`);
  lines.push('');

  // Status
  const overallAccuracy = metrics.crossLayerTracing.overall;
  const status = overallAccuracy >= 0.8 ? '✅ PASS' : overallAccuracy >= 0.7 ? '⚠️ WARNING' : '❌ FAIL';
  lines.push(`**Status**: ${status} (Target: ≥80%)`);

  return lines.join('\n');
}

/**
 * Create sample validation test cases
 */
export function createSampleTestCases(): ValidationTestCase[] {
  return [
    {
      id: 'sample-1',
      description: 'Simple React + Express + PostgreSQL stack',
      repository: 'sample/repo',
      expectedConnections: [
        {
          from: 'component:UserProfile',
          to: 'endpoint:GET /api/users/:id',
          type: 'api-call',
          confidence: 0.7,
        },
        {
          from: 'endpoint:GET /api/users/:id',
          to: 'query:user-find',
          type: 'database-query',
          confidence: 0.8,
        },
        {
          from: 'query:user-find',
          to: 'table:users',
          type: 'database-query',
          confidence: 1.0,
        },
      ],
      expectedImpact: {
        change: 'Modify /api/users endpoint',
        affectedFiles: ['src/routes/users.ts', 'src/services/userService.ts'],
        breakingChanges: 1,
      },
    },
  ];
}

