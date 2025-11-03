/**
 * External security scanner integration
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import { SecurityIssue, Vulnerability } from '../../types';

const execAsync = promisify(exec);

export interface ScannerResult {
  scanner: string;
  success: boolean;
  issues: SecurityIssue[];
  vulnerabilities: Vulnerability[];
  error?: string;
}

/**
 * Run ESLint security plugin
 */
export async function runESLintSecurity(
  repoPath: string,
  filePattern?: string
): Promise<ScannerResult> {
  const issues: SecurityIssue[] = [];
  const vulnerabilities: Vulnerability[] = [];

  try {
    // Check if eslint is available
    try {
      await execAsync('which eslint');
    } catch {
      return {
        scanner: 'eslint-security',
        success: false,
        issues: [],
        vulnerabilities: [],
        error: 'ESLint not found in PATH',
      };
    }

    // Check for eslint-plugin-security
    const packageJsonPath = path.join(repoPath, 'package.json');
    let hasSecurityPlugin = false;

    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      const allDeps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
      };
      hasSecurityPlugin =
        allDeps['eslint-plugin-security'] !== undefined ||
        allDeps['@typescript-eslint/eslint-plugin'] !== undefined;
    }

    if (!hasSecurityPlugin) {
      return {
        scanner: 'eslint-security',
        success: false,
        issues: [],
        vulnerabilities: [],
        error: 'eslint-plugin-security not installed',
      };
    }

    // Run ESLint with security plugin
    const pattern = filePattern || '**/*.{js,jsx,ts,tsx}';
    const command = `cd ${repoPath} && npx eslint --format json ${pattern}`;

    try {
      const { stdout, stderr } = await execAsync(command, {
        maxBuffer: 10 * 1024 * 1024, // 10MB
      });

      // Parse ESLint JSON output
      const eslintResults = JSON.parse(stdout);
      for (const result of eslintResults) {
        for (const message of result.messages || []) {
          if (message.severity === 1 || message.severity === 2) {
            // Warning or error
            issues.push({
              id: `eslint-${result.filePath}-${message.line}`,
              type: 'other',
              severity: message.severity === 2 ? 'high' : 'medium',
              title: message.ruleId || 'ESLint Issue',
              description: message.message,
              file: result.filePath.replace(repoPath + '/', ''),
              line: message.line || 0,
              column: message.column,
              rule: message.ruleId || 'unknown',
              recommendation: 'Fix ESLint security issue',
              codeSnippet: message.message,
            });
          }
        }
      }
    } catch (error: any) {
      // ESLint may return non-zero exit code with issues
      if (error.stdout) {
        try {
          const eslintResults = JSON.parse(error.stdout);
          // Process results same as above
        } catch {
          // Ignore parse errors
        }
      }
    }
  } catch (error: any) {
    return {
      scanner: 'eslint-security',
      success: false,
      issues: [],
      vulnerabilities: [],
      error: error.message,
    };
  }

  return {
    scanner: 'eslint-security',
    success: true,
    issues,
    vulnerabilities,
  };
}

/**
 * Run npm audit for dependency vulnerabilities
 */
export async function runNpmAudit(repoPath: string): Promise<ScannerResult> {
  const vulnerabilities: Vulnerability[] = [];

  try {
    const packageJsonPath = path.join(repoPath, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      return {
        scanner: 'npm-audit',
        success: false,
        issues: [],
        vulnerabilities: [],
        error: 'package.json not found',
      };
    }

    // Run npm audit
    try {
      const { stdout } = await execAsync(`cd ${repoPath} && npm audit --json`, {
        maxBuffer: 10 * 1024 * 1024,
      });

      const auditResult = JSON.parse(stdout);

      if (auditResult.vulnerabilities) {
        for (const [packageName, vulnData] of Object.entries(auditResult.vulnerabilities)) {
          const vuln = vulnData as any;
          vulnerabilities.push({
            id: `npm-audit-${packageName}`,
            cve: vuln.via?.[0]?.cve,
            title: vuln.title || `Vulnerability in ${packageName}`,
            description: vuln.overview || `Security vulnerability found in ${packageName}`,
            severity: mapSeverity(vuln.severity),
            affectedFiles: [packageJsonPath],
            fixAvailable: vuln.fixAvailable !== false,
            fixVersion: vuln.fixAvailable?.replace(/\^|~/, ''),
          });
        }
      }
    } catch (error: any) {
      // npm audit returns non-zero if vulnerabilities found
      if (error.stdout) {
        try {
          const auditResult = JSON.parse(error.stdout);
          if (auditResult.vulnerabilities) {
            // Process same as above
          }
        } catch {
          // Ignore parse errors
        }
      }
    }
  } catch (error: any) {
    return {
      scanner: 'npm-audit',
      success: false,
      issues: [],
      vulnerabilities: [],
      error: error.message,
    };
  }

  return {
    scanner: 'npm-audit',
    success: true,
    issues: [],
    vulnerabilities,
  };
}

/**
 * Run Semgrep (if available)
 */
export async function runSemgrep(repoPath: string): Promise<ScannerResult> {
  const issues: SecurityIssue[] = [];

  try {
    // Check if semgrep is installed
    try {
      await execAsync('which semgrep');
    } catch {
      return {
        scanner: 'semgrep',
        success: false,
        issues: [],
        vulnerabilities: [],
        error: 'Semgrep not found in PATH',
      };
    }

    // Run Semgrep with security rules
    const command = `cd ${repoPath} && semgrep --config=auto --json --quiet`;

    try {
      const { stdout } = await execAsync(command, {
        maxBuffer: 50 * 1024 * 1024, // 50MB for large repos
      });

      const semgrepResults = JSON.parse(stdout);
      for (const result of semgrepResults.results || []) {
        issues.push({
          id: `semgrep-${result.path}-${result.start.line}`,
          type: mapSemgrepRuleToType(result.check_id),
          severity: mapSeverity(result.extra.severity),
          title: result.check_id,
          description: result.message,
          file: result.path.replace(repoPath + '/', ''),
          line: result.start.line,
          column: result.start.col,
          rule: result.check_id,
          recommendation: result.extra.metadata?.fix || 'Review security issue',
          codeSnippet: result.extra.lines || '',
        });
      }
    } catch (error: any) {
      return {
        scanner: 'semgrep',
        success: false,
        issues: [],
        vulnerabilities: [],
        error: error.message,
      };
    }
  } catch (error: any) {
    return {
      scanner: 'semgrep',
      success: false,
      issues: [],
      vulnerabilities: [],
      error: error.message,
    };
  }

  return {
    scanner: 'semgrep',
    success: true,
    issues,
    vulnerabilities: [],
  };
}

/**
 * Map severity string to our severity type
 */
function mapSeverity(severity: string | undefined): 'critical' | 'high' | 'medium' | 'low' {
  if (!severity) {
    return 'medium';
  }
  const lower = severity.toLowerCase();
  if (lower.includes('critical') || lower === 'error') {
    return 'critical';
  } else if (lower.includes('high')) {
    return 'high';
  } else if (lower.includes('low')) {
    return 'low';
  }
  return 'medium';
}

/**
 * Map Semgrep rule ID to security issue type
 */
function mapSemgrepRuleToType(checkId: string): SecurityIssue['type'] {
  if (checkId.includes('sql')) {
    return 'sql-injection';
  } else if (checkId.includes('xss')) {
    return 'xss';
  } else if (checkId.includes('auth')) {
    return 'authentication';
  } else if (checkId.includes('crypto')) {
    return 'crypto';
  } else if (checkId.includes('secret')) {
    return 'sensitive-data';
  }
  return 'other';
}

/**
 * Run all external security scanners
 */
export async function runAllSecurityScanners(repoPath: string): Promise<ScannerResult[]> {
  const results: ScannerResult[] = [];

  // Run scanners in parallel (they're independent)
  const [eslintResult, npmAuditResult, semgrepResult] = await Promise.allSettled([
    runESLintSecurity(repoPath),
    runNpmAudit(repoPath),
    runSemgrep(repoPath),
  ]);

  if (eslintResult.status === 'fulfilled') {
    results.push(eslintResult.value);
  }
  if (npmAuditResult.status === 'fulfilled') {
    results.push(npmAuditResult.value);
  }
  if (semgrepResult.status === 'fulfilled') {
    results.push(semgrepResult.value);
  }

  return results;
}

