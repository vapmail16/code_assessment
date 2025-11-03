/**
 * Pattern matching utilities for lineage connections
 */

/**
 * Extract base URL from API call
 */
export function extractBaseURL(url: string): string {
  try {
    if (url.includes('://')) {
      const urlObj = new URL(url);
      return `${urlObj.protocol}//${urlObj.host}${urlObj.port ? ':' + urlObj.port : ''}`;
    }
    return '';
  } catch {
    return '';
  }
}

/**
 * Extract path from URL
 */
export function extractPathFromURL(url: string): string {
  try {
    if (url.includes('://')) {
      const urlObj = new URL(url);
      return urlObj.pathname;
    }
    // Already a path
    return url.split('?')[0].split('#')[0];
  } catch {
    return url.split('?')[0].split('#')[0];
  }
}

/**
 * Normalize path pattern (for comparison)
 */
export function normalizePathPattern(path: string): string {
  // Replace parameter placeholders
  return path
    .replace(/:[a-zA-Z_][a-zA-Z0-9_]*/g, '{param}')
    .replace(/\$\{\.\.\.\}/g, '{param}')
    .replace(/\[.*?\]/g, '{param}')
    .toLowerCase();
}

/**
 * Match paths with parameters
 */
export function matchPathsWithParams(path1: string, path2: string): {
  matches: boolean;
  confidence: number;
  matchedParams: Record<string, string>;
} {
  // Normalize both paths
  const normalized1 = normalizePathPattern(path1);
  const normalized2 = normalizePathPattern(path2);

  // Extract parameter names
  const params1 = extractParameterNames(path1);
  const params2 = extractParameterNames(path2);

  // Check if structures match
  if (normalized1 === normalized2) {
    return {
      matches: true,
      confidence: 1.0,
      matchedParams: {},
    };
  }

  // Check if same number of parameters
  if (params1.length === params2.length && params1.length > 0) {
    // Build regex pattern from path1
    const regexPattern = path1
      .replace(/:[a-zA-Z_][a-zA-Z0-9_]*/g, '([^/]+)')
      .replace(/\//g, '\\/');

    const regex = new RegExp(`^${regexPattern}$`);
    const match = regex.exec(path2);

    if (match) {
      const matchedParams: Record<string, string> = {};
      for (let i = 0; i < params1.length; i++) {
        matchedParams[params1[i]] = match[i + 1] || '';
      }

      return {
        matches: true,
        confidence: 0.8,
        matchedParams,
      };
    }
  }

  return {
    matches: false,
    confidence: 0,
    matchedParams: {},
  };
}

/**
 * Extract parameter names from path
 */
function extractParameterNames(path: string): string[] {
  const params: string[] = [];
  const paramRegex = /:([a-zA-Z_][a-zA-Z0-9_]*)/g;
  let match;

  while ((match = paramRegex.exec(path)) !== null) {
    params.push(match[1]);
  }

  return params;
}

/**
 * Resolve environment variable in URL
 */
export function resolveEnvVar(url: string, envVars: Record<string, string>): string {
  let resolved = url;

  // Look for ${VAR} or $VAR patterns
  const envVarPattern = /\$\{([^}]+)\}|\$([A-Z_][A-Z0-9_]*)/g;
  let match;

  while ((match = envVarPattern.exec(url)) !== null) {
    const varName = match[1] || match[2];
    if (envVars[varName]) {
      resolved = resolved.replace(match[0], envVars[varName]);
    }
  }

  return resolved;
}

