/**
 * Connect frontend API calls to backend endpoints
 */

import { APICall } from '../../types';
import { Endpoint, EndpointParameter } from '../../types';
import { LineageEdge, LineageNode, LineageGraph } from '../../types';

export interface ConnectionMatch {
  frontendCall: APICall;
  backendEndpoint: Endpoint;
  confidence: number;
  reasons: string[];
}

/**
 * Match frontend API calls to backend endpoints
 */
export function connectFrontendToBackend(
  frontendCalls: APICall[],
  backendEndpoints: Endpoint[]
): ConnectionMatch[] {
  const matches: ConnectionMatch[] = [];

  for (const call of frontendCalls) {
    for (const endpoint of backendEndpoints) {
      const match = matchAPICallToEndpoint(call, endpoint);
      if (match && match.confidence > 0.3) {
        // Only include matches with reasonable confidence
        matches.push(match);
      }
    }
  }

  // Sort by confidence (highest first)
  matches.sort((a, b) => b.confidence - a.confidence);

  // Remove duplicate matches (keep highest confidence)
  return deduplicateMatches(matches);
}

/**
 * Match a single API call to an endpoint
 */
function matchAPICallToEndpoint(call: APICall, endpoint: Endpoint): ConnectionMatch | null {
  const reasons: string[] = [];
  let confidence = 0;

  // Method matching (required)
  if (call.method === endpoint.method) {
    confidence += 0.3;
    reasons.push('HTTP method matches');
  } else {
    return null; // Methods must match
  }

  // URL matching
  if (call.url) {
    // Static URL
    const urlMatch = matchURL(call.url, endpoint.path);
    if (urlMatch.matched) {
      confidence += urlMatch.confidence;
      reasons.push(`URL matches: ${call.url} -> ${endpoint.path}`);
    }
  } else if (call.urlPattern) {
    // Dynamic URL pattern
    const patternMatch = matchPattern(call.urlPattern, endpoint.pathPattern);
    if (patternMatch.matched) {
      confidence += patternMatch.confidence;
      reasons.push(`URL pattern matches: ${call.urlPattern} -> ${endpoint.pathPattern}`);
    }
  }

  // Path parameter matching
  const paramMatch = matchParameters(call, endpoint);
  if (paramMatch.matched) {
    confidence += paramMatch.confidence;
    reasons.push('Path parameters compatible');
  }

  if (confidence > 0) {
    return {
      frontendCall: call,
      backendEndpoint: endpoint,
      confidence: Math.min(1.0, confidence),
      reasons,
    };
  }

  return null;
}

/**
 * Match URL strings
 */
function matchURL(callURL: string, endpointPath: string): {
  matched: boolean;
  confidence: number;
} {
  // Normalize URLs
  const normalizedCall = normalizeURL(callURL);
  const normalizedEndpoint = normalizePath(endpointPath);

  // Exact match
  if (normalizedCall === normalizedEndpoint) {
    return { matched: true, confidence: 0.5 };
  }

  // Check if call URL contains endpoint path (or vice versa)
  if (normalizedCall.includes(normalizedEndpoint) || normalizedEndpoint.includes(normalizedCall)) {
    return { matched: true, confidence: 0.4 };
  }

  // Check if paths match after removing base URL
  const callPath = extractPath(normalizedCall);
  const endpointPathOnly = extractPath(normalizedEndpoint);

  if (callPath === endpointPathOnly) {
    return { matched: true, confidence: 0.45 };
  }

  // Pattern matching with parameters
  if (matchPathPattern(callPath, endpointPathOnly)) {
    return { matched: true, confidence: 0.35 };
  }

  return { matched: false, confidence: 0 };
}

/**
 * Match URL patterns
 */
function matchPattern(callPattern: string, endpointPattern: string): {
  matched: boolean;
  confidence: number;
} {
  // Convert patterns to comparable format
  const callNormalized = normalizePattern(callPattern);
  const endpointNormalized = normalizePattern(endpointPattern);

  // Exact pattern match
  if (callNormalized === endpointNormalized) {
    return { matched: true, confidence: 0.4 };
  }

  // Check if patterns are similar (same structure)
  if (comparePatternStructure(callNormalized, endpointNormalized)) {
    return { matched: true, confidence: 0.3 };
  }

  return { matched: false, confidence: 0 };
}

/**
 * Match parameters
 */
function matchParameters(call: APICall, endpoint: Endpoint): {
  matched: boolean;
  confidence: number;
} {
  // If endpoint has parameters and call URL has similar structure
  if (endpoint.parameters.length > 0) {
    // Check if call URL pattern includes parameters
    const callPattern = call.urlPattern || call.url || '';
    const endpointParamCount = endpoint.parameters.filter((p) => p.type === 'path').length;

    // Count dynamic segments in call pattern
    const dynamicSegments = (callPattern.match(/\$\{\.\.\.\}|\[.*?\]/g) || []).length;

    if (dynamicSegments === endpointParamCount) {
      return { matched: true, confidence: 0.2 };
    }
  }

  return { matched: false, confidence: 0 };
}

/**
 * Normalize URL
 */
function normalizeURL(url: string): string {
  // Remove protocol, domain, port
  let normalized = url
    .replace(/^https?:\/\//i, '')
    .replace(/^\/\/+/, '/')
    .split('/')
    .filter((s) => s)
    .join('/');

  // Remove query strings and fragments
  normalized = normalized.split('?')[0].split('#')[0];

  // Ensure leading slash
  if (!normalized.startsWith('/')) {
    normalized = '/' + normalized;
  }

  return normalized.toLowerCase();
}

/**
 * Normalize path
 */
function normalizePath(path: string): string {
  // Remove leading/trailing slashes and normalize
  const normalized = path
    .replace(/^\/+|\/+$/g, '')
    .split('/')
    .filter((s) => s)
    .join('/');

  return '/' + normalized;
}

/**
 * Extract path from URL
 */
function extractPath(url: string): string {
  try {
    // If it's a full URL, extract pathname
    if (url.includes('://')) {
      const urlObj = new URL(url);
      return urlObj.pathname;
    }
    // Otherwise, it's already a path
    return url.split('?')[0].split('#')[0];
  } catch {
    // If URL parsing fails, treat as path
    return url.split('?')[0].split('#')[0];
  }
}

/**
 * Match path pattern (with parameters)
 */
function matchPathPattern(callPath: string, endpointPath: string): boolean {
  // Convert endpoint path with :param to regex pattern
  const endpointRegex = endpointPath
    .replace(/:[a-zA-Z_][a-zA-Z0-9_]*/g, '[^/]+')
    .replace(/\//g, '\\/');

  const regex = new RegExp(`^${endpointRegex}$`);
  return regex.test(callPath);
}

/**
 * Normalize pattern string
 */
function normalizePattern(pattern: string): string {
  // Replace all dynamic segments with placeholders
  return pattern
    .replace(/\$\{\.\.\.\}/g, '{param}')
    .replace(/\[.*?\]/g, '{param}')
    .toLowerCase();
}

/**
 * Compare pattern structure
 */
function comparePatternStructure(pattern1: string, pattern2: string): boolean {
  // Split by segments
  const segments1 = pattern1.split('/');
  const segments2 = pattern2.split('/');

  if (segments1.length !== segments2.length) {
    return false;
  }

  // Compare each segment (static segments must match, dynamic can vary)
  for (let i = 0; i < segments1.length; i++) {
    const seg1 = segments1[i];
    const seg2 = segments2[i];

    // If both are parameters, that's fine
    if (seg1.includes('{param}') && seg2.includes('{param}')) {
      continue;
    }

    // If both are static, they must match
    if (!seg1.includes('{param}') && !seg2.includes('{param}')) {
      if (seg1 !== seg2) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Deduplicate matches (keep highest confidence per call)
 */
function deduplicateMatches(matches: ConnectionMatch[]): ConnectionMatch[] {
  const bestMatches = new Map<string, ConnectionMatch>();

  for (const match of matches) {
    const key = match.frontendCall.id;
    const existing = bestMatches.get(key);

    if (!existing || match.confidence > existing.confidence) {
      bestMatches.set(key, match);
    }
  }

  return Array.from(bestMatches.values());
}

/**
 * Create lineage edges from matches
 */
export function createFrontendBackendEdges(matches: ConnectionMatch[]): LineageEdge[] {
  return matches.map((match) => {
    const frontendNodeId = `api-call:${match.frontendCall.id}`;
    const backendNodeId = `endpoint:${match.backendEndpoint.id}`;

    return {
      id: `edge:${frontendNodeId}-${backendNodeId}`,
      from: frontendNodeId,
      to: backendNodeId,
      type: 'api-call',
      label: `${match.frontendCall.method} ${match.frontendCall.url || match.frontendCall.urlPattern}`,
      confidence: match.confidence,
      data: {
        method: match.frontendCall.method,
        url: match.frontendCall.url || match.frontendCall.urlPattern,
        reasons: match.reasons,
      },
    };
  });
}

