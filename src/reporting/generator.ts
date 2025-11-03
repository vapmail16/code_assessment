/**
 * Report generation
 */

import { AssessmentResult } from '../types';
import { LineageGraph } from '../types';
import { ImpactAnalysis } from '../types';

/**
 * Generate assessment report in markdown format
 */
export function generateAssessmentReport(
  assessment: AssessmentResult
): string {
  const lines: string[] = [];

  lines.push('# Code Assessment Report');
  lines.push('');
  lines.push(`**Repository**: ${assessment.repository}`);
  lines.push(`**Generated**: ${assessment.timestamp.toISOString()}`);
  lines.push('');

  // Executive Summary
  lines.push('## Executive Summary');
  lines.push('');
  lines.push(`**Overall Score**: ${assessment.summary.overallScore}/100`);
  lines.push('');
  lines.push('| Category | Score |');
  lines.push('|----------|-------|');
  lines.push(`| Security | ${assessment.summary.securityScore}/100 |`);
  lines.push(`| Quality | ${assessment.summary.qualityScore}/100 |`);
  lines.push(`| Architecture | ${assessment.summary.architectureScore}/100 |`);
  lines.push('');
  lines.push(`**Total Issues**: ${assessment.summary.totalIssues}`);
  lines.push(`- Critical: ${assessment.summary.criticalIssues}`);
  lines.push(`- High: ${assessment.summary.highIssues}`);
  lines.push(`- Medium: ${assessment.summary.mediumIssues}`);
  lines.push(`- Low: ${assessment.summary.lowIssues}`);
  lines.push('');

  // Security Assessment
  lines.push('## Security Assessment');
  lines.push('');
  lines.push(`**Score**: ${assessment.security.score}/100`);
  lines.push('');
  lines.push(`**Issues Found**: ${assessment.security.issues.length}`);
  lines.push('');
  if (assessment.security.issues.length > 0) {
    lines.push('### Security Issues');
    lines.push('');
    for (const issue of assessment.security.issues.slice(0, 20)) {
      // Limit to top 20
      lines.push(`#### ${issue.title}`);
      lines.push(`- **Severity**: ${issue.severity}`);
      lines.push(`- **File**: ${issue.file}:${issue.line}`);
      lines.push(`- **Description**: ${issue.description}`);
      lines.push(`- **Recommendation**: ${issue.recommendation}`);
      if (issue.codeSnippet) {
        lines.push('```');
        lines.push(issue.codeSnippet);
        lines.push('```');
      }
      lines.push('');
    }
  }

  // Quality Assessment
  lines.push('## Quality Assessment');
  lines.push('');
  lines.push(`**Score**: ${assessment.quality.score}/100`);
  lines.push('');
  lines.push('### Code Metrics');
  lines.push('');
  lines.push(`- **Lines of Code**: ${assessment.quality.metrics.linesOfCode.toLocaleString()}`);
  lines.push(`- **Cyclomatic Complexity**: ${assessment.quality.metrics.cyclomaticComplexity.toFixed(2)}`);
  lines.push(`- **Maintainability Index**: ${assessment.quality.metrics.maintainabilityIndex.toFixed(2)}`);
  lines.push(`- **Technical Debt**: ${assessment.quality.metrics.technicalDebt.toFixed(1)} hours`);
  lines.push(`- **Code Duplication**: ${assessment.quality.metrics.codeDuplication.toFixed(1)}%`);
  lines.push('');
  lines.push(`**Issues Found**: ${assessment.quality.issues.length}`);
  if (assessment.quality.issues.length > 0 && assessment.quality.issues.length <= 20) {
    lines.push('');
    lines.push('### Quality Issues');
    lines.push('');
    for (const issue of assessment.quality.issues) {
      lines.push(`- **${issue.severity.toUpperCase()}**: ${issue.title} (${issue.file}:${issue.line})`);
    }
  }
  lines.push('');

  // Architecture Assessment
  lines.push('## Architecture Assessment');
  lines.push('');
  lines.push(`**Score**: ${assessment.architecture.score}/100`);
  lines.push('');
  if (assessment.architecture.patterns.length > 0) {
    lines.push('### Detected Patterns');
    lines.push('');
    for (const pattern of assessment.architecture.patterns) {
      lines.push(`- **${pattern.name}** (${pattern.type}): ${pattern.description}`);
    }
    lines.push('');
  }
  if (assessment.architecture.antiPatterns.length > 0) {
    lines.push('### Anti-Patterns');
    lines.push('');
    for (const antiPattern of assessment.architecture.antiPatterns) {
      lines.push(`- **${antiPattern.name}** (${antiPattern.severity}): ${antiPattern.description}`);
    }
    lines.push('');
  }
  lines.push(`**Issues Found**: ${assessment.architecture.issues.length}`);
  lines.push('');

  return lines.join('\n');
}

/**
 * Generate lineage report
 */
export function generateLineageReport(graph: LineageGraph): string {
  const lines: string[] = [];

  lines.push('# Code Lineage Report');
  lines.push('');
  lines.push('## Graph Overview');
  lines.push('');
  lines.push(`- **Total Nodes**: ${graph.metadata.totalNodes}`);
  lines.push(`- **Total Edges**: ${graph.metadata.totalEdges}`);
  lines.push(`- **Layers**:`);
  lines.push(`  - Frontend: ${graph.layers.frontend.length} nodes`);
  lines.push(`  - Backend: ${graph.layers.backend.length} nodes`);
  lines.push(`  - Database: ${graph.layers.database.length} nodes`);
  lines.push('');
  lines.push('## Layer Connections');
  lines.push('');
  lines.push(`- **Average Confidence**: ${(graph.metadata.confidence.average * 100).toFixed(1)}%`);
  lines.push(`- **Longest Path**: ${graph.metadata.longestPath} nodes`);
  lines.push(`- **Disconnected Components**: ${graph.metadata.disconnectedComponents}`);
  lines.push('');

  return lines.join('\n');
}

/**
 * Generate impact analysis report
 */
export function generateImpactReport(impact: ImpactAnalysis): string {
  const lines: string[] = [];

  lines.push('# Change Impact Analysis Report');
  lines.push('');
  lines.push(`**Change Request**: ${impact.changeRequest.description}`);
  lines.push(`**Type**: ${impact.changeRequest.type}`);
  lines.push('');
  lines.push('## Impact Summary');
  lines.push('');
  lines.push(`- **Total Affected Files**: ${impact.summary.totalAffectedFiles}`);
  lines.push(`- **Total Affected Nodes**: ${impact.summary.totalAffectedNodes}`);
  lines.push(`- **Breaking Changes**: ${impact.summary.breakingChangesCount}`);
  lines.push(`- **Estimated Complexity**: ${impact.summary.estimatedComplexity}`);
  if (impact.summary.estimatedTime) {
    lines.push(`- **Estimated Time**: ${impact.summary.estimatedTime} hours`);
  }
  lines.push('');

  if (impact.affectedFiles.length > 0) {
    lines.push('## Affected Files');
    lines.push('');
    for (const file of impact.affectedFiles.slice(0, 50)) {
      // Limit to 50 files
      lines.push(`- ${file}`);
    }
    lines.push('');
  }

  if (impact.breakingChanges.length > 0) {
    lines.push('## Breaking Changes');
    lines.push('');
    for (const change of impact.breakingChanges) {
      lines.push(`### ${change.description}`);
      lines.push(`- **Severity**: ${change.severity}`);
      lines.push(`- **File**: ${change.file}:${change.line || 'N/A'}`);
      lines.push(`- **Impact**: ${change.impact}`);
      if (change.migrationPath) {
        lines.push(`- **Migration Path**: ${change.migrationPath}`);
      }
      lines.push('');
    }
  }

  if (impact.recommendations.length > 0) {
    lines.push('## Recommendations');
    lines.push('');
    for (const rec of impact.recommendations) {
      lines.push(`### ${rec.title}`);
      lines.push(`- **Priority**: ${rec.priority}`);
      lines.push(`- **Type**: ${rec.type}`);
      lines.push(`- **Description**: ${rec.description}`);
      lines.push('');
    }
  }

  return lines.join('\n');
}

