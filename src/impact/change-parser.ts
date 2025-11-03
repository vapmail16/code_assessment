/**
 * Parse and validate change requests
 */

import { ChangeRequest, ChangeType } from '../types';

/**
 * Parse change request from natural language or structured input
 */
export function parseChangeRequest(input: string | ChangeRequest): ChangeRequest {
  // If already a ChangeRequest, validate and return
  if (typeof input !== 'string') {
    return validateChangeRequest(input);
  }

  // Parse from natural language (simplified)
  const changeRequest: ChangeRequest = {
    id: generateChangeId(),
    type: inferChangeType(input),
    description: input,
    affectedAreas: inferAffectedAreas(input),
    priority: inferPriority(input),
    metadata: {},
  };

  return changeRequest;
}

/**
 * Infer change type from description
 */
function inferChangeType(description: string): ChangeType {
  const lower = description.toLowerCase();

  if (lower.includes('endpoint') || lower.includes('api') || lower.includes('route')) {
    return 'modify-api';
  } else if (lower.includes('schema') || lower.includes('table') || lower.includes('database') || lower.includes('model')) {
    return 'modify-schema';
  } else if (lower.includes('component') || lower.includes('ui') || lower.includes('page')) {
    return 'modify-feature';
  } else if (lower.includes('add') || lower.includes('new')) {
    return 'add-feature';
  } else if (lower.includes('remove') || lower.includes('delete')) {
    return 'remove-feature';
  } else if (lower.includes('bug') || lower.includes('fix')) {
    return 'bug-fix';
  }

  return 'modify-feature'; // Default
}

/**
 * Infer affected areas from description
 */
function inferAffectedAreas(description: string): string[] {
  const areas: string[] = [];
  const lower = description.toLowerCase();

  if (lower.includes('frontend') || lower.includes('ui') || lower.includes('component')) {
    areas.push('frontend');
  }
  if (lower.includes('backend') || lower.includes('api') || lower.includes('endpoint')) {
    areas.push('backend');
  }
  if (lower.includes('database') || lower.includes('schema') || lower.includes('table')) {
    areas.push('database');
  }

  return areas.length > 0 ? areas : ['frontend', 'backend', 'database']; // Default to all
}

/**
 * Infer priority from description
 */
function inferPriority(description: string): 'low' | 'medium' | 'high' | 'critical' {
  const lower = description.toLowerCase();

  if (lower.includes('critical') || lower.includes('urgent') || lower.includes('bug')) {
    return 'critical';
  } else if (lower.includes('important') || lower.includes('high')) {
    return 'high';
  } else if (lower.includes('low') || lower.includes('nice to have')) {
    return 'low';
  }

  return 'medium'; // Default
}

/**
 * Validate change request
 */
function validateChangeRequest(change: ChangeRequest): ChangeRequest {
  if (!change.id) {
    change.id = generateChangeId();
  }
  if (!change.type) {
    change.type = 'modify-feature';
  }
  if (!change.description) {
    throw new Error('Change request must have a description');
  }
  if (!change.affectedAreas || change.affectedAreas.length === 0) {
    change.affectedAreas = ['frontend', 'backend', 'database'];
  }
  if (!change.priority) {
    change.priority = 'medium';
  }

  return change;
}

/**
 * Generate unique change ID
 */
function generateChangeId(): string {
  return `change-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Extract specific change details from request
 */
export function extractChangeDetails(change: ChangeRequest): {
  targetFiles?: string[];
  targetEndpoints?: string[];
  targetTables?: string[];
  targetComponents?: string[];
} {
  const details: {
    targetFiles?: string[];
    targetEndpoints?: string[];
    targetTables?: string[];
    targetComponents?: string[];
  } = {};

  const desc = change.description.toLowerCase();

  // Extract file paths
  const fileMatches = change.description.match(/(?:file|path):\s*([^\s,]+)/gi);
  if (fileMatches) {
    details.targetFiles = fileMatches.map((m) => m.split(':')[1].trim());
  }

  // Extract endpoint patterns
  const endpointMatches = change.description.match(/(?:endpoint|route|api):\s*([^\s,]+)/gi);
  if (endpointMatches) {
    details.targetEndpoints = endpointMatches.map((m) => m.split(':')[1].trim());
  }

  // Extract table names
  const tableMatches = change.description.match(/(?:table|model):\s*([a-zA-Z_][a-zA-Z0-9_]*)/gi);
  if (tableMatches) {
    details.targetTables = tableMatches.map((m) => m.split(':')[1].trim());
  }

  // Extract component names
  const componentMatches = change.description.match(/(?:component|page):\s*([a-zA-Z_][a-zA-Z0-9_]*)/gi);
  if (componentMatches) {
    details.targetComponents = componentMatches.map((m) => m.split(':')[1].trim());
  }

  return details;
}

