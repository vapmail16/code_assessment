/**
 * Main assessment engine - combines all assessment types
 */

import { AssessmentResult, AssessmentSummary } from '../types';
import { SecurityAssessment } from '../types';
import { QualityAssessment } from '../types';
import { ArchitectureAssessment } from '../types';
import { FileTree, DependencyGraph, LineageGraph } from '../types';
import { ParsedFile } from '../types';
import { runSecurityScan } from './security/scanner';
import { runQualityChecks } from './quality/linter';
import { detectArchitecturePatterns } from './architecture/patterns';
import { RepositoryFileAnalyzer } from '../github/file-analyzer';

export interface AssessmentContext {
  repoPath: string;
  fileTree: FileTree;
  parsedFiles: ParsedFile[];
  dependencyGraph?: DependencyGraph;
  lineageGraph?: LineageGraph;
}

/**
 * Run complete assessment
 */
export async function runAssessment(
  context: AssessmentContext
): Promise<AssessmentResult> {
  // Run security scan
  const security = await runSecurityScan(context.repoPath, context.fileTree);

  // Run quality checks
  const quality = runQualityChecks(
    context.parsedFiles,
    context.dependencyGraph
  );

  // Detect architecture patterns
  const architecture = detectArchitecturePatterns(
    context.parsedFiles,
    context.dependencyGraph,
    context.lineageGraph
  );

  // Generate summary
  const summary = generateSummary(security, quality, architecture);

  return {
    repository: context.repoPath,
    timestamp: new Date(),
    security,
    quality,
    architecture,
    summary,
  };
}

/**
 * Generate assessment summary
 */
function generateSummary(
  security: SecurityAssessment,
  quality: QualityAssessment,
  architecture: ArchitectureAssessment
): AssessmentSummary {
  const criticalIssues = security.issues.filter((i) => i.severity === 'critical').length +
    security.vulnerabilities.filter((v) => v.severity === 'critical').length;

  const highIssues = security.issues.filter((i) => i.severity === 'high').length +
    quality.issues.filter((i) => i.severity === 'error').length +
    architecture.issues.filter((i) => i.severity === 'high').length;

  const mediumIssues = security.issues.filter((i) => i.severity === 'medium').length +
    quality.issues.filter((i) => i.severity === 'warning').length +
    architecture.issues.filter((i) => i.severity === 'medium').length;

  const lowIssues = security.issues.filter((i) => i.severity === 'low').length +
    quality.issues.filter((i) => i.severity === 'info').length +
    architecture.issues.filter((i) => i.severity === 'low').length;

  const totalIssues = criticalIssues + highIssues + mediumIssues + lowIssues;

  // Calculate overall score (weighted average)
  const overallScore = (security.score * 0.4 + quality.score * 0.35 + architecture.score * 0.25);

  return {
    overallScore: Math.round(overallScore),
    securityScore: Math.round(security.score),
    qualityScore: Math.round(quality.score),
    architectureScore: Math.round(architecture.score),
    totalIssues,
    criticalIssues,
    highIssues,
    mediumIssues,
    lowIssues,
  };
}

