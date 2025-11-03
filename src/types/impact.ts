/**
 * Impact analysis types
 */

export interface ImpactAnalysis {
  repository: string;
  timestamp: Date;
  changeRequest: ChangeRequest;
  affectedNodes: AffectedNode[];
  affectedFiles: string[];
  dependencyChain: DependencyChain;
  breakingChanges: BreakingChange[];
  recommendations: Recommendation[];
  summary: ImpactSummary;
}

export interface ChangeRequest {
  id: string;
  description: string;
  type: ChangeType;
  targetFiles: string[];
  targetComponents?: string[];
  targetEndpoints?: string[];
  targetTables?: string[];
  parsedIntent?: ParsedIntent;
}

export type ChangeType =
  | 'add-feature'
  | 'modify-feature'
  | 'remove-feature'
  | 'modify-api'
  | 'modify-schema'
  | 'refactor'
  | 'bug-fix'
  | 'other';

export interface ParsedIntent {
  entities: string[]; // Affected entities
  operations: string[]; // Operations (add, modify, delete)
  locations: string[]; // Locations mentioned
  confidence: number;
}

export interface AffectedNode {
  nodeId: string;
  nodeType: string;
  file: string;
  layer: 'frontend' | 'backend' | 'database';
  impactType: 'direct' | 'indirect';
  impactReason: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  depth: number; // How many hops from original change
}

export interface DependencyChain {
  chains: DependencyPath[];
  maxDepth: number;
  totalAffected: number;
}

export interface DependencyPath {
  from: string; // Starting node ID
  to: string; // Ending node ID
  nodes: string[]; // All nodes in path
  edges: string[]; // All edges in path
  type: 'forward' | 'backward'; // Forward = what depends on change, backward = what change depends on
}

export interface BreakingChange {
  id: string;
  type: BreakingChangeType;
  severity: 'critical' | 'high' | 'medium';
  description: string;
  affectedNode: string;
  file: string;
  line?: number;
  impact: string;
  migrationPath?: string;
}

export type BreakingChangeType =
  | 'api-parameter-removed'
  | 'api-parameter-added-required'
  | 'api-response-changed'
  | 'schema-column-removed'
  | 'schema-column-type-changed'
  | 'export-removed'
  | 'type-incompatibility'
  | 'other';

export interface Recommendation {
  id: string;
  type: RecommendationType;
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  affectedFiles: string[];
  suggestedChanges: CodeChange[];
  relatedFiles: string[];
}

export type RecommendationType =
  | 'code-change'
  | 'test-update'
  | 'documentation-update'
  | 'refactor'
  | 'migration'
  | 'review-required';

export interface CodeChange {
  file: string;
  type: 'add' | 'modify' | 'delete';
  location: {
    line: number;
    column?: number;
  };
  oldCode?: string;
  newCode: string;
  description: string;
}

export interface ImpactSummary {
  totalAffectedFiles: number;
  totalAffectedNodes: number;
  criticalImpact: number;
  highImpact: number;
  mediumImpact: number;
  lowImpact: number;
  breakingChangesCount: number;
  estimatedComplexity: 'low' | 'medium' | 'high';
  estimatedTime?: number; // in hours
}

