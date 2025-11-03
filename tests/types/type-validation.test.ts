/**
 * Type validation tests
 * These tests ensure types compile correctly and can be instantiated
 */

import * as Types from '../../src/types';

describe('Type Definitions', () => {
  it('should have valid Repository type', () => {
    const repo: Types.Repository = {
      id: 'test-repo',
      url: 'https://github.com/test/repo',
      name: 'test-repo',
      owner: 'test',
      branch: 'main',
      defaultBranch: 'main',
      cloneUrl: 'https://github.com/test/repo.git',
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {
        size: 0,
        languages: [],
        fileCount: 0,
      },
    };
    expect(repo).toBeDefined();
    expect(repo.id).toBe('test-repo');
  });

  it('should have valid TechStack type', () => {
    const techStack: Types.TechStack = {
      frontend: [
        {
          name: 'React',
          type: 'frontend',
          version: '18.0.0',
          confidence: 0.9,
          indicators: [],
          files: ['package.json'],
        },
      ],
      overallConfidence: 0.9,
      detectedAt: new Date(),
    };
    expect(techStack).toBeDefined();
    expect(techStack.frontend?.length).toBe(1);
  });

  it('should have valid LineageGraph type', () => {
    const graph: Types.LineageGraph = {
      nodes: [],
      edges: [],
      layers: {
        frontend: [],
        backend: [],
        database: [],
      },
      metadata: {
        totalNodes: 0,
        totalEdges: 0,
        nodeCounts: {} as Record<Types.LineageNodeType, number>,
        edgeCounts: {} as Record<Types.LineageEdgeType, number>,
        confidence: {
          average: 0,
          min: 0,
          max: 0,
          distribution: [],
        },
        disconnectedComponents: 0,
        longestPath: 0,
      },
    };
    expect(graph).toBeDefined();
    expect(graph.nodes).toEqual([]);
  });

  it('should have valid AssessmentResult type', () => {
    const assessment: Types.AssessmentResult = {
      repository: 'test-repo',
      timestamp: new Date(),
      security: {
        issues: [],
        vulnerabilities: [],
        dependencies: [],
        score: 100,
      },
      quality: {
        issues: [],
        metrics: {
          linesOfCode: 0,
          cyclomaticComplexity: 0,
          maintainabilityIndex: 100,
          technicalDebt: 0,
          codeDuplication: 0,
        },
        score: 100,
      },
      architecture: {
        issues: [],
        patterns: [],
        antiPatterns: [],
        score: 100,
      },
      summary: {
        overallScore: 100,
        securityScore: 100,
        qualityScore: 100,
        architectureScore: 100,
        totalIssues: 0,
        criticalIssues: 0,
        highIssues: 0,
        mediumIssues: 0,
        lowIssues: 0,
      },
    };
    expect(assessment).toBeDefined();
    expect(assessment.summary.overallScore).toBe(100);
  });

  it('should have valid ImpactAnalysis type', () => {
    const impact: Types.ImpactAnalysis = {
      repository: 'test-repo',
      timestamp: new Date(),
      changeRequest: {
        id: 'change-1',
        description: 'Add new feature',
        type: 'add-feature',
        targetFiles: [],
      },
      affectedNodes: [],
      affectedFiles: [],
      dependencyChain: {
        chains: [],
        maxDepth: 0,
        totalAffected: 0,
      },
      breakingChanges: [],
      recommendations: [],
      summary: {
        totalAffectedFiles: 0,
        totalAffectedNodes: 0,
        criticalImpact: 0,
        highImpact: 0,
        mediumImpact: 0,
        lowImpact: 0,
        breakingChangesCount: 0,
        estimatedComplexity: 'low',
      },
    };
    expect(impact).toBeDefined();
    expect(impact.changeRequest.type).toBe('add-feature');
  });
});

