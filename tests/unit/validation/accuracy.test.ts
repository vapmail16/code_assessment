/**
 * Unit tests for accuracy validation
 */

import {
  validateLineageAccuracy,
  validateImpactAccuracy,
  createSampleTestCases,
  generateAccuracyReport,
} from '../../../src/validation/accuracy';
import { LineageGraph, LineageNode, LineageEdge } from '../../../src/types';
import { ImpactAnalysis } from '../../../src/types';

describe('Accuracy Validation', () => {
  test('should validate lineage graph connections', () => {
    const graph: LineageGraph = {
      nodes: [
        {
          id: 'component:UserProfile',
          type: 'component',
          layer: 'frontend',
          label: 'UserProfile',
          file: 'src/components/UserProfile.tsx',
        },
        {
          id: 'endpoint:GET /api/users/:id',
          type: 'endpoint',
          layer: 'backend',
          label: 'GET /api/users/:id',
          file: 'src/routes/users.ts',
        },
      ],
      edges: [
        {
          id: 'edge:1',
          from: 'component:UserProfile',
          to: 'endpoint:GET /api/users/:id',
          type: 'api-call',
          label: 'GET /api/users/:id',
          confidence: 0.8,
        },
      ],
      layers: {
        frontend: [],
        backend: [],
        database: [],
      },
      metadata: {
        totalNodes: 2,
        totalEdges: 1,
        nodeCounts: {} as any,
        edgeCounts: {} as any,
        confidence: { average: 0.8, min: 0.8, max: 0.8, distribution: [] },
        disconnectedComponents: 0,
        longestPath: 1,
      },
    };

    const testCases = createSampleTestCases();
    const metrics = validateLineageAccuracy(graph, testCases);

    expect(metrics.crossLayerTracing.overall).toBeGreaterThanOrEqual(0);
    expect(metrics.totalValidations).toBeGreaterThan(0);
  });

  test('should validate impact analysis accuracy', () => {
    const impact: ImpactAnalysis = {
      repository: 'test/repo',
      timestamp: new Date(),
      changeRequest: {
        id: '1',
        type: 'modify-api',
        description: 'Modify endpoint',
      },
      affectedFiles: ['src/routes/users.ts', 'src/services/userService.ts'],
      affectedNodes: [],
      dependencyChain: { chains: [], maxDepth: 0, totalAffected: 0 },
      breakingChanges: [],
      recommendations: [],
      summary: {
        totalAffectedFiles: 2,
        totalAffectedNodes: 0,
        criticalImpact: 0,
        highImpact: 0,
        mediumImpact: 0,
        lowImpact: 0,
        breakingChangesCount: 0,
        estimatedComplexity: 'low',
      },
    };

    const testCases = createSampleTestCases();
    const metrics = validateImpactAccuracy(impact, testCases);

    expect(metrics.precision).toBeGreaterThanOrEqual(0);
    expect(metrics.recall).toBeGreaterThanOrEqual(0);
    expect(metrics.f1Score).toBeGreaterThanOrEqual(0);
  });

  test('should generate accuracy report', () => {
    const testCases = createSampleTestCases();
    const graph: LineageGraph = {
      nodes: [],
      edges: [],
      layers: { frontend: [], backend: [], database: [] },
      metadata: {
        totalNodes: 0,
        totalEdges: 0,
        nodeCounts: {} as any,
        edgeCounts: {} as any,
        confidence: { average: 0, min: 0, max: 0, distribution: [] },
        disconnectedComponents: 0,
        longestPath: 0,
      },
    };

    const metrics = validateLineageAccuracy(graph, testCases);
    const report = generateAccuracyReport(metrics, testCases);

    expect(report).toContain('Accuracy Validation Report');
    expect(report).toContain('Cross-Layer Tracing Accuracy');
  });
});

