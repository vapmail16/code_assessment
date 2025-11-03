/**
 * Code quality linting
 */

import { QualityIssue, CodeMetrics, QualityAssessment } from '../../types';
import { ParsedFile } from '../../types';
import { DependencyGraph } from '../../types';

/**
 * Run quality checks on code
 */
export function runQualityChecks(
  parsedFiles: ParsedFile[],
  dependencyGraph?: DependencyGraph
): QualityAssessment {
  const issues: QualityIssue[] = [];

  // Check code style
  issues.push(...checkCodeStyle(parsedFiles));

  // Check complexity
  issues.push(...checkComplexity(parsedFiles));

  // Check duplication
  issues.push(...checkDuplication(parsedFiles));

  // Check performance issues
  issues.push(...checkPerformance(parsedFiles));

  // Check best practices
  issues.push(...checkBestPractices(parsedFiles));

  // Calculate metrics
  const metrics = calculateMetrics(parsedFiles);

  // Calculate quality score
  const score = calculateQualityScore(issues, metrics);

  return {
    issues,
    metrics,
    score,
  };
}

/**
 * Check code style issues
 */
function checkCodeStyle(parsedFiles: ParsedFile[]): QualityIssue[] {
  const issues: QualityIssue[] = [];

  for (const file of parsedFiles) {
    // Check for console.log statements (should use proper logging)
    if (file.path.includes('.js') || file.path.includes('.ts')) {
      const content = fs.readFileSync(file.path, 'utf-8');
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes('console.log(') && !line.trim().startsWith('//')) {
          issues.push({
            id: `style-${file.path}-${i}`,
            type: 'code-style',
            severity: 'warning',
            title: 'console.log() usage',
            description: 'Consider using a proper logging library in production',
            file: file.path,
            line: i + 1,
            rule: 'no-console-log',
            recommendation: 'Replace console.log with a logging library (winston, pino, etc.)',
            codeSnippet: line.trim(),
          });
        }
      }
    }
  }

  return issues;
}

/**
 * Check code complexity
 */
function checkComplexity(parsedFiles: ParsedFile[]): QualityIssue[] {
  const issues: QualityIssue[] = [];

  for (const file of parsedFiles) {
    if (file.complexity && file.complexity > 10) {
      issues.push({
        id: `complexity-${file.path}`,
        type: 'complexity',
        severity: 'warning',
        title: 'High Cyclomatic Complexity',
        description: `File has complexity of ${file.complexity}, consider refactoring`,
        file: file.path,
        line: 1,
        rule: 'max-complexity',
        recommendation: 'Break down complex functions into smaller, testable functions',
      });
    }

    // Check for large files
    if (file.linesOfCode > 500) {
      issues.push({
        id: `large-file-${file.path}`,
        type: 'complexity',
        severity: 'info',
        title: 'Large File',
        description: `File has ${file.linesOfCode} lines, consider splitting into smaller modules`,
        file: file.path,
        line: 1,
        rule: 'max-lines',
        recommendation: 'Split file into smaller, focused modules',
      });
    }
  }

  return issues;
}

/**
 * Check code duplication (simplified)
 */
function checkDuplication(parsedFiles: ParsedFile[]): QualityIssue[] {
  const issues: QualityIssue[] = [];
  const codeBlocks = new Map<string, { file: string; line: number }[]>();

  // Simple duplication detection (exact line matching)
  for (const file of parsedFiles) {
    const content = fs.readFileSync(file.path, 'utf-8');
    const lines = content.split('\n');

    for (let i = 0; i < lines.length - 3; i++) {
      // Check 3-line blocks
      const block = lines.slice(i, i + 3).join('\n');
      const normalized = block.trim();

      if (normalized.length > 20) {
        // Only check meaningful blocks
        if (!codeBlocks.has(normalized)) {
          codeBlocks.set(normalized, []);
        }
        codeBlocks.get(normalized)!.push({ file: file.path, line: i + 1 });
      }
    }
  }

  // Report duplicates
  for (const [block, locations] of codeBlocks.entries()) {
    if (locations.length > 1) {
      issues.push({
        id: `duplication-${locations[0].file}`,
        type: 'duplication',
        severity: 'info',
        title: 'Potential Code Duplication',
        description: `Similar code found in ${locations.length} locations`,
        file: locations[0].file,
        line: locations[0].line,
        rule: 'no-duplication',
        recommendation: 'Extract common code into reusable functions',
      });
    }
  }

  return issues;
}

/**
 * Check performance issues
 */
function checkPerformance(parsedFiles: ParsedFile[]): QualityIssue[] {
  const issues: QualityIssue[] = [];

  for (const file of parsedFiles) {
    let content: string;
    try {
      content = fs.readFileSync(file.path, 'utf-8');
    } catch {
      continue;
    }
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // N+1 query pattern
      if (/for\s*\(.*of.*\)/.test(line) || /\.map\(.*=>\s*\{/.test(line)) {
        // Check next few lines for potential N+1
        const nextLines = lines.slice(i, i + 5).join('\n');
        if (nextLines.match(/await.*find|await.*findOne|await.*query/)) {
          issues.push({
            id: `performance-${file.path}-${i}`,
            type: 'performance',
            severity: 'warning',
            title: 'Potential N+1 Query Problem',
            description: 'Query inside loop may cause performance issues',
            file: file.path,
            line: i + 1,
            rule: 'no-n-plus-one',
            recommendation: 'Use batch queries or eager loading',
            codeSnippet: lines.slice(i, i + 3).join('\n'),
          });
        }
      }

      // Inefficient regex
      if (/new RegExp\(['"]([^'"]*)['"]\)/.test(line)) {
        const regexMatch = line.match(/new RegExp\(['"]([^'"]*)['"]\)/);
        if (regexMatch && regexMatch[1].includes('.*.*')) {
          issues.push({
            id: `performance-regex-${file.path}-${i}`,
            type: 'performance',
            severity: 'info',
            title: 'Inefficient Regex Pattern',
            description: 'Regex pattern may cause performance issues',
            file: file.path,
            line: i + 1,
            rule: 'no-inefficient-regex',
            recommendation: 'Optimize regex pattern',
          });
        }
      }
    }
  }

  return issues;
}

/**
 * Check best practices
 */
function checkBestPractices(parsedFiles: ParsedFile[]): QualityIssue[] {
  const issues: QualityIssue[] = [];

  for (const file of parsedFiles) {
    let content: string;
    try {
      content = fs.readFileSync(file.path, 'utf-8');
    } catch {
      continue;
    }
    const lines = content.split('\n');

    // Check for magic numbers
    const magicNumberPattern = /(?:if|while|for|switch)\s*\([^)]*\b\d{3,}\b/;
    for (let i = 0; i < lines.length; i++) {
      if (magicNumberPattern.test(lines[i])) {
        issues.push({
          id: `best-practice-${file.path}-${i}`,
          type: 'best-practice',
          severity: 'info',
          title: 'Magic Number',
          description: 'Consider using named constants instead of magic numbers',
          file: file.path,
          line: i + 1,
          rule: 'no-magic-numbers',
          recommendation: 'Define constants for numeric values',
        });
      }
    }
  }

  return issues;
}

/**
 * Calculate code metrics
 */
function calculateMetrics(parsedFiles: ParsedFile[]): CodeMetrics {
  let totalLOC = 0;
  let totalComplexity = 0;
  let totalDebt = 0;
  let duplicateLines = 0;

  for (const file of parsedFiles) {
    totalLOC += file.linesOfCode;
    totalComplexity += file.complexity || 0;
    
    // Estimate technical debt (simplified)
    if (file.complexity && file.complexity > 10) {
      totalDebt += (file.complexity - 10) * 0.5; // 0.5 hours per complexity point over 10
    }
    if (file.linesOfCode > 500) {
      totalDebt += (file.linesOfCode - 500) * 0.01; // 0.01 hours per line over 500
    }
  }

  // Calculate maintainability index (simplified formula)
  const avgComplexity = parsedFiles.length > 0 ? totalComplexity / parsedFiles.length : 0;
  const maintainabilityIndex = Math.max(
    0,
    Math.min(100, 171 - 5.2 * Math.log(avgComplexity || 1) - 0.23 * Math.log(totalLOC || 1))
  );

  return {
    linesOfCode: totalLOC,
    cyclomaticComplexity: avgComplexity,
    maintainabilityIndex,
    technicalDebt: totalDebt,
    codeDuplication: duplicateLines,
  };
}

/**
 * Calculate quality score (0-100)
 */
function calculateQualityScore(issues: QualityIssue[], metrics: CodeMetrics): number {
  let score = 100;

  // Deduct based on issues
  for (const issue of issues) {
    switch (issue.severity) {
      case 'error':
        score -= 5;
        break;
      case 'warning':
        score -= 2;
        break;
      case 'info':
        score -= 0.5;
        break;
    }
  }

  // Deduct based on metrics
  if (metrics.maintainabilityIndex < 50) {
    score -= 10;
  } else if (metrics.maintainabilityIndex < 70) {
    score -= 5;
  }

  if (metrics.codeDuplication > 10) {
    score -= 5;
  }

  return Math.max(0, Math.min(100, score));
}

import * as fs from 'fs';

