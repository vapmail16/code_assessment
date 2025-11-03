/**
 * Code assessment types
 */

export interface AssessmentResult {
  repository: string;
  timestamp: Date;
  security: SecurityAssessment;
  quality: QualityAssessment;
  architecture: ArchitectureAssessment;
  summary: AssessmentSummary;
}

export interface AssessmentSummary {
  overallScore: number; // 0-100
  securityScore: number;
  qualityScore: number;
  architectureScore: number;
  totalIssues: number;
  criticalIssues: number;
  highIssues: number;
  mediumIssues: number;
  lowIssues: number;
}

export interface SecurityAssessment {
  issues: SecurityIssue[];
  vulnerabilities: Vulnerability[];
  dependencies: DependencySecurity[];
  score: number; // 0-100
}

export interface SecurityIssue {
  id: string;
  type: SecurityIssueType;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  file: string;
  line: number;
  column?: number;
  rule: string; // Rule identifier
  recommendation: string;
  codeSnippet?: string;
}

export type SecurityIssueType =
  | 'sql-injection'
  | 'xss'
  | 'csrf'
  | 'authentication'
  | 'authorization'
  | 'sensitive-data'
  | 'crypto'
  | 'insecure-dependency'
  | 'other';

export interface Vulnerability {
  id: string;
  cve?: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  affectedFiles: string[];
  fixAvailable: boolean;
  fixVersion?: string;
}

export interface DependencySecurity {
  name: string;
  version: string;
  vulnerabilities: Vulnerability[];
  latestVersion: string;
  outdated: boolean;
}

export interface QualityAssessment {
  issues: QualityIssue[];
  metrics: CodeMetrics;
  score: number;
}

export interface QualityIssue {
  id: string;
  type: QualityIssueType;
  severity: 'error' | 'warning' | 'info';
  title: string;
  description: string;
  file: string;
  line: number;
  column?: number;
  rule: string;
  recommendation: string;
  codeSnippet?: string;
}

export type QualityIssueType =
  | 'code-style'
  | 'complexity'
  | 'duplication'
  | 'performance'
  | 'maintainability'
  | 'best-practice'
  | 'documentation'
  | 'other';

export interface CodeMetrics {
  linesOfCode: number;
  cyclomaticComplexity: number;
  maintainabilityIndex: number;
  technicalDebt: number; // in hours
  codeDuplication: number; // percentage
  testCoverage?: number; // percentage, if available
}

export interface ArchitectureAssessment {
  issues: ArchitectureIssue[];
  patterns: Pattern[];
  antiPatterns: AntiPattern[];
  score: number;
}

export interface ArchitectureIssue {
  id: string;
  type: ArchitectureIssueType;
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  affectedFiles: string[];
  recommendation: string;
}

export type ArchitectureIssueType =
  | 'circular-dependency'
  | 'god-object'
  | 'large-file'
  | 'tight-coupling'
  | 'violation-of-layers'
  | 'missing-abstraction'
  | 'other';

export interface Pattern {
  name: string;
  type: 'design-pattern' | 'architectural-pattern';
  confidence: number;
  files: string[];
  description: string;
}

export interface AntiPattern {
  name: string;
  severity: 'high' | 'medium' | 'low';
  files: string[];
  description: string;
  recommendation: string;
}

