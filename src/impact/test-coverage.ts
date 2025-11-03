/**
 * Test coverage integration for impact analysis
 */

import { ImpactAnalysis } from '../types';
import { TestFile, mapTestsToCode, findAffectedTests } from '../analyzers/testing/test-detector';
import { FileTree } from '../types';

/**
 * Enhance impact analysis with test coverage information
 */
export function addTestCoverageToImpact(
  impact: ImpactAnalysis,
  testFiles: TestFile[],
  fileTree: FileTree
): ImpactAnalysis & {
  affectedTests: string[];
  testCoverage: {
    totalTests: number;
    affectedTests: number;
    coverageByFile: Map<string, string[]>;
  };
} {
  // Map tests to code
  const testCoverageMap = mapTestsToCode(testFiles, fileTree);

  // Find affected tests
  const affectedTests = findAffectedTests(impact.affectedFiles, testCoverageMap);

  // Build coverage summary
  const coverageByFile = new Map<string, string[]>();
  for (const file of impact.affectedFiles) {
    const tests = testCoverageMap.get(file) || [];
    if (tests.length > 0) {
      coverageByFile.set(file, tests);
    }
  }

  return {
    ...impact,
    affectedTests,
    testCoverage: {
      totalTests: testFiles.length,
      affectedTests: affectedTests.length,
      coverageByFile,
    },
  };
}

/**
 * Add test recommendations to impact analysis
 */
export function addTestRecommendations(
  impact: ImpactAnalysis,
  affectedTests: string[]
): ImpactAnalysis['recommendations'] {
  const recommendations: ImpactAnalysis['recommendations'] = [];

  if (affectedTests.length > 0) {
    recommendations.push({
      id: 'update-tests',
      priority: 'high' as const,
      type: 'test-update' as const,
      title: 'Update Affected Tests',
      description: `${affectedTests.length} test file(s) may need updates due to code changes: ${affectedTests.slice(0, 3).join(', ')}${affectedTests.length > 3 ? '...' : ''}`,
      affectedFiles: affectedTests,
      suggestedChanges: [],
      relatedFiles: [],
    });
  }

  return recommendations;
}
