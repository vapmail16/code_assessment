/**
 * Test file detection and mapping
 */

import { FileTree, FileNode } from '../../types';
import * as path from 'path';

export interface TestFile {
  path: string;
  name: string;
  type: 'unit' | 'integration' | 'e2e' | 'unknown';
  framework: 'jest' | 'mocha' | 'pytest' | 'vitest' | 'unknown';
  testSuites: string[];
  tests: string[];
  covers?: string[]; // Files/components this test covers
}

/**
 * Detect test files in repository
 */
export function detectTestFiles(fileTree: FileTree): TestFile[] {
  const testFiles: TestFile[] = [];

  for (const [relativePath, fileNode] of fileTree.files) {
    if (fileNode.type !== 'file') {
      continue;
    }

    if (isTestFile(relativePath, fileNode)) {
      const testFile = parseTestFile(relativePath, fileNode);
      if (testFile) {
        testFiles.push(testFile);
      }
    }
  }

  return testFiles;
}

/**
 * Check if file is a test file
 */
function isTestFile(filePath: string, fileNode: FileNode): boolean {
  const fileName = path.basename(filePath);
  const ext = path.extname(filePath).toLowerCase();

  // Common test file patterns
  const testPatterns = [
    /\.test\./i,
    /\.spec\./i,
    /\.test$/i,
    /\.spec$/i,
    /^test/i,
    /^spec/i,
  ];

  const hasTestPattern = testPatterns.some((pattern) => pattern.test(fileName));

  // Check directory name
  const dirName = path.dirname(filePath).toLowerCase();
  const isInTestDir =
    dirName.includes('test') ||
    dirName.includes('spec') ||
    dirName.includes('__tests__') ||
    dirName.includes('__spec__');

  return hasTestPattern || isInTestDir;
}

/**
 * Parse test file to extract information
 */
function parseTestFile(filePath: string, fileNode: FileNode): TestFile | null {
  const fileName = path.basename(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const content = fileNode.content || '';

  // Detect test framework
  const framework = detectTestFramework(content, ext);

  // Detect test type
  const testType = detectTestType(filePath, content);

  // Extract test suites and tests (basic pattern matching)
  const testSuites: string[] = [];
  const tests: string[] = [];

  // Jest/Mocha patterns: describe('Suite', () => {...})
  const describePattern = /describe\s*\(['"]([^'"]+)['"]/gi;
  let match;
  while ((match = describePattern.exec(content)) !== null) {
    testSuites.push(match[1]);
  }

  // Test patterns: it('test', ...), test('test', ...)
  const testPattern = /(?:it|test)\s*\(['"]([^'"]+)['"]/gi;
  while ((match = testPattern.exec(content)) !== null) {
    tests.push(match[1]);
  }

  // Try to infer what code this test covers
  const covers = inferTestCoverage(filePath, content);

  return {
    path: filePath,
    name: fileName,
    type: testType,
    framework,
    testSuites,
    tests,
    covers,
  };
}

/**
 * Detect test framework
 */
function detectTestFramework(content: string, ext: string): TestFile['framework'] {
  if (content.includes('jest') || content.includes('@jest/') || content.includes('jest.config')) {
    return 'jest';
  }
  if (content.includes('vitest') || content.includes('import { describe, it } from "vitest"')) {
    return 'vitest';
  }
  if (content.includes('mocha') || content.includes('require(\'mocha\')')) {
    return 'mocha';
  }
  if (ext === '.py' && (content.includes('pytest') || content.includes('def test_'))) {
    return 'pytest';
  }
  return 'unknown';
}

/**
 * Detect test type
 */
function detectTestType(filePath: string, content: string): TestFile['type'] {
  const lowerPath = filePath.toLowerCase();
  const lowerContent = content.toLowerCase();

  if (lowerPath.includes('e2e') || lowerPath.includes('end-to-end') || lowerContent.includes('cypress') || lowerContent.includes('playwright')) {
    return 'e2e';
  }
  if (lowerPath.includes('integration') || lowerPath.includes('integration-test')) {
    return 'integration';
  }
  if (lowerPath.includes('unit') || lowerPath.includes('unit-test')) {
    return 'unit';
  }

  // Default inference
  if (lowerContent.includes('render') || lowerContent.includes('screen.getby')) {
    return 'unit'; // Likely unit test for components
  }

  return 'unknown';
}

/**
 * Infer what code files this test covers
 */
function inferTestCoverage(testPath: string, content: string): string[] {
  const coveredFiles: string[] = [];

  // Common patterns:
  // - import from '../src/Component'
  // - require('../lib/module')
  // - Reference to file names in test descriptions

  // Extract imports/requires that look like source files
  const importPattern = /(?:import|require)\s*(?:\(|from)\s*['"]([^'"]+)['"]/g;
  let match;

  while ((match = importPattern.exec(content)) !== null) {
    const importPath = match[1];
    // Skip node_modules and test utilities
    if (
      !importPath.startsWith('.') &&
      !importPath.startsWith('/') &&
      (importPath.includes('node_modules') ||
        importPath.includes('jest') ||
        importPath.includes('mocha') ||
        importPath.includes('vitest'))
    ) {
      continue;
    }

    // Try to resolve relative path
    const testDir = path.dirname(testPath);
    const resolvedPath = path.resolve(testDir, importPath);

    // Remove extension and try to find source file
    const basePath = resolvedPath.replace(/\.(test|spec)\./, '.').replace(/\.(test|spec)$/, '');

    // Try common extensions
    const extensions = ['.ts', '.tsx', '.js', '.jsx'];
    for (const ext of extensions) {
      const possibleFile = basePath + ext;
      if (possibleFile !== testPath) {
        coveredFiles.push(possibleFile);
        break; // Found one, move on
      }
    }
  }

  // Also check test name patterns that might reference files
  // e.g., "Component.test.tsx" likely tests "Component.tsx"
  const testFileName = path.basename(testPath);
  const sourceFileName = testFileName.replace(/\.(test|spec)\./, '.').replace(/\.(test|spec)$/, '');
  if (sourceFileName !== testFileName) {
    const testDir = path.dirname(testPath);
    const possibleSourceFile = path.join(testDir, '..', sourceFileName);
    coveredFiles.push(possibleSourceFile);
  }

  return Array.from(new Set(coveredFiles)); // Deduplicate
}

/**
 * Map tests to code files
 */
export function mapTestsToCode(testFiles: TestFile[], fileTree: FileTree): Map<string, string[]> {
  // Map: code file path -> array of test file paths that cover it
  const testCoverageMap = new Map<string, string[]>();

  for (const testFile of testFiles) {
    if (testFile.covers) {
      for (const coveredFile of testFile.covers) {
        if (!testCoverageMap.has(coveredFile)) {
          testCoverageMap.set(coveredFile, []);
        }
        testCoverageMap.get(coveredFile)!.push(testFile.path);
      }
    }
  }

  return testCoverageMap;
}

/**
 * Find tests that need updates for a change
 */
export function findAffectedTests(
  changedFiles: string[],
  testCoverageMap: Map<string, string[]>
): string[] {
  const affectedTests = new Set<string>();

  for (const changedFile of changedFiles) {
    const tests = testCoverageMap.get(changedFile);
    if (tests) {
      for (const test of tests) {
        affectedTests.add(test);
      }
    }
  }

  return Array.from(affectedTests);
}

