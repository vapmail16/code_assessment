/**
 * Security scanning integration
 */

import { SecurityIssue, Vulnerability, DependencySecurity, SecurityAssessment } from '../../types';
import { FileTree } from '../../types';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Run security scan on repository
 */
export async function runSecurityScan(
  repoPath: string,
  fileTree: FileTree
): Promise<SecurityAssessment> {
  const issues: SecurityIssue[] = [];
  const vulnerabilities: Vulnerability[] = [];
  const dependencies: DependencySecurity[] = [];

  // Scan for common security issues
  issues.push(...scanForSQLInjection(repoPath, fileTree));
  issues.push(...scanForXSS(repoPath, fileTree));
  issues.push(...scanForSensitiveData(repoPath, fileTree));
  issues.push(...scanForInsecureDependencies(repoPath, fileTree));

  // Scan package files for vulnerabilities
  const packageVulns = scanPackageFiles(repoPath, fileTree);
  vulnerabilities.push(...packageVulns);

  // Calculate security score
  const score = calculateSecurityScore(issues, vulnerabilities);

  return {
    issues,
    vulnerabilities,
    dependencies,
    score,
  };
}

/**
 * Scan for SQL injection vulnerabilities
 */
function scanForSQLInjection(repoPath: string, fileTree: FileTree): SecurityIssue[] {
  const issues: SecurityIssue[] = [];

  // Common SQL injection patterns
  const sqlInjectionPatterns = [
    {
      pattern: /query\(['"]([^'"]*)\$\{([^}]+)\}([^'"]*)['"]/,
      severity: 'critical' as const,
      description: 'SQL query with template string interpolation',
    },
    {
      pattern: /db\.query\(['"].*\+.*['"]/,
      severity: 'high' as const,
      description: 'SQL query with string concatenation',
    },
    {
      pattern: /execute\(['"]([^'"]*)\$\{([^}]+)\}([^'"]*)['"]/,
      severity: 'critical' as const,
      description: 'SQL execute with template interpolation',
    },
  ];

  for (const [relativePath, fileNode] of fileTree.files) {
    if (fileNode.type !== 'file' || !fileNode.content) {
      continue;
    }

    const filePath = path.join(repoPath, relativePath);
    const lines = fileNode.content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (const pattern of sqlInjectionPatterns) {
        if (pattern.pattern.test(line)) {
          issues.push({
            id: `sql-injection-${filePath}-${i}`,
            type: 'sql-injection',
            severity: pattern.severity,
            title: 'Potential SQL Injection',
            description: pattern.description,
            file: relativePath,
            line: i + 1,
            rule: 'sql-injection-detection',
            recommendation: 'Use parameterized queries or prepared statements',
            codeSnippet: line.trim(),
          });
        }
      }
    }
  }

  return issues;
}

/**
 * Scan for XSS vulnerabilities
 */
function scanForXSS(repoPath: string, fileTree: FileTree): SecurityIssue[] {
  const issues: SecurityIssue[] = [];

  // Common XSS patterns
  const xssPatterns = [
    {
      pattern: /dangerouslySetInnerHTML\s*=\s*\{([^}]+)\}/,
      severity: 'high' as const,
      description: 'Use of dangerouslySetInnerHTML without sanitization',
    },
    {
      pattern: /innerHTML\s*=\s*([^;]+)/,
      severity: 'high' as const,
      description: 'Direct innerHTML assignment',
    },
    {
      pattern: /eval\(/,
      severity: 'critical' as const,
      description: 'Use of eval() function',
    },
  ];

  for (const [relativePath, fileNode] of fileTree.files) {
    if (fileNode.type !== 'file' || !fileNode.content) {
      continue;
    }

    // Only scan frontend files for XSS
    if (!relativePath.match(/\.(js|jsx|ts|tsx|vue)$/)) {
      continue;
    }

    const lines = fileNode.content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (const pattern of xssPatterns) {
        if (pattern.pattern.test(line)) {
          issues.push({
            id: `xss-${relativePath}-${i}`,
            type: 'xss',
            severity: pattern.severity,
            title: 'Potential XSS Vulnerability',
            description: pattern.description,
            file: relativePath,
            line: i + 1,
            rule: 'xss-detection',
            recommendation: 'Sanitize user input before rendering',
            codeSnippet: line.trim(),
          });
        }
      }
    }
  }

  return issues;
}

/**
 * Scan for sensitive data exposure
 */
function scanForSensitiveData(repoPath: string, fileTree: FileTree): SecurityIssue[] {
  const issues: SecurityIssue[] = [];

  // Common sensitive data patterns
  const sensitivePatterns = [
    {
      pattern: /password\s*[:=]\s*['"]([^'"]+)['"]/i,
      severity: 'critical' as const,
      description: 'Hardcoded password',
    },
    {
      pattern: /api[_-]?key\s*[:=]\s*['"]([^'"]+)['"]/i,
      severity: 'high' as const,
      description: 'Hardcoded API key',
    },
    {
      pattern: /secret\s*[:=]\s*['"]([^'"]+)['"]/i,
      severity: 'high' as const,
      description: 'Hardcoded secret',
    },
    {
      pattern: /aws[_-]?access[_-]?key/i,
      severity: 'high' as const,
      description: 'AWS access key',
    },
  ];

  for (const [relativePath, fileNode] of fileTree.files) {
    if (fileNode.type !== 'file' || !fileNode.content) {
      continue;
    }

    // Skip node_modules, build files
    if (relativePath.includes('node_modules') || relativePath.includes('dist')) {
      continue;
    }

    const lines = fileNode.content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (const pattern of sensitivePatterns) {
        if (pattern.pattern.test(line)) {
          issues.push({
            id: `sensitive-${relativePath}-${i}`,
            type: 'sensitive-data',
            severity: pattern.severity,
            title: 'Sensitive Data Exposure',
            description: pattern.description,
            file: relativePath,
            line: i + 1,
            rule: 'sensitive-data-detection',
            recommendation: 'Use environment variables or secure configuration management',
            codeSnippet: line.trim().substring(0, 100), // Truncate to avoid exposing full secret
          });
        }
      }
    }
  }

  return issues;
}

/**
 * Scan for insecure dependencies
 */
function scanForInsecureDependencies(repoPath: string, fileTree: FileTree): SecurityIssue[] {
  const issues: SecurityIssue[] = [];

  // Check package.json files
  for (const [relativePath, fileNode] of fileTree.files) {
    if (path.basename(relativePath) === 'package.json' && fileNode.content) {
      try {
        const packageData = JSON.parse(fileNode.content);
        const deps = { ...packageData.dependencies, ...packageData.devDependencies };

        // Check for known insecure packages (simplified list)
        const insecurePackages: Record<string, string> = {
          'express-session': 'Use secure session configuration',
          'helmet': 'Recommended for Express security',
        };

        for (const [depName, recommendation] of Object.entries(insecurePackages)) {
          if (deps[depName]) {
            issues.push({
              id: `insecure-dep-${relativePath}-${depName}`,
              type: 'insecure-dependency',
              severity: 'medium',
              title: `Potential Security Issue: ${depName}`,
              description: recommendation,
              file: relativePath,
              line: 1,
              rule: 'dependency-security-check',
              recommendation,
            });
          }
        }
      } catch {
        // Invalid JSON, skip
      }
    }
  }

  return issues;
}

/**
 * Scan package files for vulnerabilities
 */
function scanPackageFiles(repoPath: string, fileTree: FileTree): Vulnerability[] {
  const vulnerabilities: Vulnerability[] = [];

  // This would integrate with npm audit, yarn audit, etc.
  // For now, return empty array
  // In production, would call: npm audit --json

  return vulnerabilities;
}

/**
 * Calculate security score (0-100)
 */
function calculateSecurityScore(
  issues: SecurityIssue[],
  vulnerabilities: Vulnerability[]
): number {
  let score = 100;

  // Deduct points based on severity
  for (const issue of issues) {
    switch (issue.severity) {
      case 'critical':
        score -= 10;
        break;
      case 'high':
        score -= 5;
        break;
      case 'medium':
        score -= 2;
        break;
      case 'low':
        score -= 1;
        break;
    }
  }

  for (const vuln of vulnerabilities) {
    switch (vuln.severity) {
      case 'critical':
        score -= 15;
        break;
      case 'high':
        score -= 8;
        break;
      case 'medium':
        score -= 3;
        break;
      case 'low':
        score -= 1;
        break;
    }
  }

  return Math.max(0, Math.min(100, score));
}

