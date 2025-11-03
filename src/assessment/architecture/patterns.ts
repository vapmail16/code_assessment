/**
 * Architecture pattern detection
 */

import { ArchitectureIssue, Pattern, AntiPattern, ArchitectureAssessment } from '../../types';
import { DependencyGraph, LineageGraph } from '../../types';
import { ParsedFile } from '../../types';

/**
 * Detect architecture patterns and issues
 */
export function detectArchitecturePatterns(
  parsedFiles: ParsedFile[],
  dependencyGraph?: DependencyGraph,
  lineageGraph?: LineageGraph
): ArchitectureAssessment {
  const issues: ArchitectureIssue[] = [];
  const patterns: Pattern[] = [];
  const antiPatterns: AntiPattern[] = [];

  // Detect circular dependencies
  if (dependencyGraph) {
    const circularIssues = detectCircularDependencies(dependencyGraph);
    issues.push(...circularIssues);
  }

  // Detect god objects
  const godObjectIssues = detectGodObjects(parsedFiles);
  issues.push(...godObjectIssues);
  antiPatterns.push(...godObjectIssues.map((issue) => ({
    name: 'God Object',
    severity: 'high' as const,
    files: issue.affectedFiles,
    description: issue.description,
    recommendation: issue.recommendation,
  })));

  // Detect large files
  const largeFileIssues = detectLargeFiles(parsedFiles);
  issues.push(...largeFileIssues);

  // Detect tight coupling
  const couplingIssues = detectTightCoupling(dependencyGraph);
  issues.push(...couplingIssues);

  // Detect layer violations (if lineage graph available)
  if (lineageGraph) {
    const layerIssues = detectLayerViolations(lineageGraph);
    issues.push(...layerIssues);
  }

  // Detect patterns
  if (dependencyGraph) {
    const mvcPattern = detectMVCPattern(dependencyGraph, parsedFiles);
    if (mvcPattern) {
      patterns.push(mvcPattern);
    }

    const layeredPattern = detectLayeredArchitecture(dependencyGraph, parsedFiles);
    if (layeredPattern) {
      patterns.push(layeredPattern);
    }
  }

  // Calculate architecture score
  const score = calculateArchitectureScore(issues, antiPatterns);

  return {
    issues,
    patterns,
    antiPatterns,
    score,
  };
}

/**
 * Detect circular dependencies
 */
function detectCircularDependencies(graph: DependencyGraph): ArchitectureIssue[] {
  const issues: ArchitectureIssue[] = [];
  const cycles = findCycles(graph);

  for (const cycle of cycles) {
    const files = cycle.map((nodeId) => {
      const node = graph.nodes.find((n) => n.id === nodeId);
      return node?.file || '';
    }).filter((f) => f);

    if (files.length > 0) {
      issues.push({
        id: `circular-${files[0]}`,
        type: 'circular-dependency',
        severity: 'high',
        title: 'Circular Dependency Detected',
        description: `Circular dependency between ${files.length} files: ${files.join(', ')}`,
        affectedFiles: files,
        recommendation: 'Refactor to break circular dependency, use dependency injection or event system',
      });
    }
  }

  return issues;
}

/**
 * Find cycles in dependency graph
 */
function findCycles(graph: DependencyGraph): string[][] {
  const cycles: string[][] = [];
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function dfs(nodeId: string, path: string[]): void {
    visited.add(nodeId);
    recursionStack.add(nodeId);
    path.push(nodeId);

    const outgoing = graph.edges.filter((e) => e.from === nodeId && e.type === 'import');
    for (const edge of outgoing) {
      if (recursionStack.has(edge.to)) {
        // Found cycle
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

/**
 * Detect god objects (classes/files with too many responsibilities)
 */
function detectGodObjects(parsedFiles: ParsedFile[]): ArchitectureIssue[] {
  const issues: ArchitectureIssue[] = [];

  for (const file of parsedFiles) {
    // Check for classes with too many methods
    for (const cls of file.classes || []) {
      if (cls.methods.length > 20) {
        issues.push({
          id: `god-object-${file.path}-${cls.name}`,
          type: 'god-object',
          severity: 'high',
          title: 'God Object Detected',
          description: `Class ${cls.name} has ${cls.methods.length} methods, indicating too many responsibilities`,
          affectedFiles: [file.path],
          recommendation: 'Apply Single Responsibility Principle, split into smaller classes',
        });
      }
    }

    // Check for files with too many exports
    if (file.exports.length > 15) {
      issues.push({
        id: `large-file-${file.path}`,
        type: 'large-file',
        severity: 'medium',
        title: 'File with Too Many Exports',
        description: `File exports ${file.exports.length} items, may have too many responsibilities`,
        affectedFiles: [file.path],
        recommendation: 'Split file into smaller, focused modules',
      });
    }
  }

  return issues;
}

/**
 * Detect large files
 */
function detectLargeFiles(parsedFiles: ParsedFile[]): ArchitectureIssue[] {
  const issues: ArchitectureIssue[] = [];

  for (const file of parsedFiles) {
    if (file.linesOfCode > 1000) {
      issues.push({
        id: `large-file-loc-${file.path}`,
        type: 'large-file',
        severity: 'medium',
        title: 'Very Large File',
        description: `File has ${file.linesOfCode} lines of code, difficult to maintain`,
        affectedFiles: [file.path],
        recommendation: 'Split into smaller modules (recommended: < 500 lines)',
      });
    }
  }

  return issues;
}

/**
 * Detect tight coupling
 */
function detectTightCoupling(graph?: DependencyGraph): ArchitectureIssue[] {
  const issues: ArchitectureIssue[] = [];

  if (!graph) {
    return issues;
  }

  // Find files with too many dependencies
  const fileDependencies = new Map<string, number>();

  for (const edge of graph.edges) {
    if (edge.type === 'import') {
      const fromFile = graph.nodes.find((n) => n.id === edge.from)?.file;
      if (fromFile) {
        fileDependencies.set(fromFile, (fileDependencies.get(fromFile) || 0) + 1);
      }
    }
  }

  for (const [file, depCount] of fileDependencies.entries()) {
    if (depCount > 10) {
      issues.push({
        id: `tight-coupling-${file}`,
        type: 'tight-coupling',
        severity: 'medium',
        title: 'High Coupling Detected',
        description: `File has ${depCount} direct dependencies, indicating tight coupling`,
        affectedFiles: [file],
        recommendation: 'Reduce dependencies by introducing abstraction layers',
      });
    }
  }

  return issues;
}

/**
 * Detect layer violations
 */
function detectLayerViolations(lineageGraph: LineageGraph): ArchitectureIssue[] {
  const issues: ArchitectureIssue[] = [];

  // Check for direct database access from frontend (shouldn't happen, but check anyway)
  for (const edge of lineageGraph.edges) {
    if (edge.type === 'database-query') {
      const fromNode = lineageGraph.nodes.find((n) => n.id === edge.from);
      if (fromNode && fromNode.layer === 'frontend') {
        issues.push({
          id: `layer-violation-${edge.id}`,
          type: 'violation-of-layers',
          severity: 'high',
          title: 'Layer Violation: Direct Database Access',
          description: 'Frontend code appears to directly access database',
          affectedFiles: [fromNode.file],
          recommendation: 'Access database only through backend API endpoints',
        });
      }
    }
  }

  return issues;
}

/**
 * Detect MVC pattern
 */
function detectMVCPattern(
  graph: DependencyGraph,
  parsedFiles: ParsedFile[]
): Pattern | null {
  // Look for common MVC indicators:
  // - Files with 'controller', 'model', 'view' in names
  const controllers = parsedFiles.filter((f) =>
    f.path.toLowerCase().includes('controller')
  );
  const models = parsedFiles.filter((f) => f.path.toLowerCase().includes('model'));
  const views = parsedFiles.filter((f) => f.path.toLowerCase().includes('view'));

  if (controllers.length > 0 && models.length > 0) {
    return {
      name: 'MVC (Model-View-Controller)',
      type: 'architectural-pattern',
      confidence: 0.7,
      files: [...controllers, ...models, ...views].map((f) => f.path),
      description: 'MVC pattern detected based on file structure',
    };
  }

  return null;
}

/**
 * Detect layered architecture
 */
function detectLayeredArchitecture(
  graph: DependencyGraph,
  parsedFiles: ParsedFile[]
): Pattern | null {
  // Look for common layered architecture indicators:
  // - service, repository, controller layers
  const services = parsedFiles.filter((f) => f.path.toLowerCase().includes('service'));
  const repositories = parsedFiles.filter((f) =>
    f.path.toLowerCase().includes('repository') || f.path.toLowerCase().includes('repo')
  );
  const controllers = parsedFiles.filter((f) =>
    f.path.toLowerCase().includes('controller')
  );

  if (services.length > 0 && repositories.length > 0 && controllers.length > 0) {
    return {
      name: 'Layered Architecture',
      type: 'architectural-pattern',
      confidence: 0.8,
      files: [...controllers, ...services, ...repositories].map((f) => f.path),
      description: 'Layered architecture detected (Controller → Service → Repository)',
    };
  }

  return null;
}

/**
 * Calculate architecture score (0-100)
 */
function calculateArchitectureScore(
  issues: ArchitectureIssue[],
  antiPatterns: AntiPattern[]
): number {
  let score = 100;

  // Deduct based on issues
  for (const issue of issues) {
    switch (issue.severity) {
      case 'high':
        score -= 10;
        break;
      case 'medium':
        score -= 5;
        break;
      case 'low':
        score -= 2;
        break;
    }
  }

  // Deduct for anti-patterns
  for (const antiPattern of antiPatterns) {
    switch (antiPattern.severity) {
      case 'high':
        score -= 8;
        break;
      case 'medium':
        score -= 4;
        break;
      case 'low':
        score -= 2;
        break;
    }
  }

  return Math.max(0, Math.min(100, score));
}

