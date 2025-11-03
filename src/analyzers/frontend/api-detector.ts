/**
 * Frontend API call detection
 */

import traverse, { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import { APICall } from '../../types';
import { ParsedFile } from '../../types';

/**
 * Detect API calls in frontend code
 */
export function detectAPICalls(parsedFile: ParsedFile): APICall[] {
  const apiCalls: APICall[] = [];

  if (!parsedFile.ast) {
    return apiCalls;
  }

  const ast = parsedFile.ast as t.File;
  let callId = 0;

  traverse(ast, {
    // Fetch API calls
    CallExpression(path) {
      const callExpr = path.node;

      // fetch() calls
      if (t.isIdentifier(callExpr.callee) && callExpr.callee.name === 'fetch') {
        const apiCall = extractFetchCall(callExpr, parsedFile, path, `fetch-${++callId}`);
        if (apiCall) {
          apiCalls.push(apiCall);
        }
      }

      // axios.get(), axios.post(), etc.
      if (t.isMemberExpression(callExpr.callee)) {
        const apiCall = extractAxiosCall(callExpr, parsedFile, path, `axios-${++callId}`);
        if (apiCall) {
          apiCalls.push(apiCall);
        }
      }

      // GraphQL queries
      const graphqlCall = extractGraphQLCall(callExpr, parsedFile, path, `graphql-${++callId}`);
      if (graphqlCall) {
        apiCalls.push(graphqlCall);
      }
    },
  });

  return apiCalls;
}

/**
 * Extract fetch() API call
 */
function extractFetchCall(
  node: t.CallExpression,
  parsedFile: ParsedFile,
  path: NodePath<t.CallExpression>,
  id: string
): APICall | null {
  if (node.arguments.length === 0) {
    return null;
  }

  const urlArg = node.arguments[0];
  let url: string | null = null;
  let urlPattern: string | undefined;
  let method = 'GET';
  const headers: Record<string, string> = {};
  let body: any = undefined;

  // Extract URL
  if (t.isStringLiteral(urlArg)) {
    url = urlArg.value;
  } else if (t.isTemplateLiteral(urlArg)) {
    urlPattern = extractTemplateString(urlArg);
    url = null; // Dynamic URL
  } else if (t.isIdentifier(urlArg) || t.isMemberExpression(urlArg)) {
    // Variable reference - dynamic URL
    urlPattern = extractExpressionPattern(urlArg);
    url = null;
  }

  // Extract options (second argument)
  if (node.arguments.length > 1 && t.isObjectExpression(node.arguments[1])) {
    const options = node.arguments[1];
    for (const prop of options.properties) {
      if (t.isObjectProperty(prop)) {
        const key = t.isIdentifier(prop.key) ? prop.key.name : null;

        if (key === 'method' && t.isStringLiteral(prop.value)) {
          method = prop.value.value.toUpperCase() as any;
        } else if (key === 'headers' && t.isObjectExpression(prop.value)) {
          extractHeaders(prop.value, headers);
        } else if (key === 'body' && t.isExpression(prop.value)) {
          body = extractBody(prop.value);
        }
      }
    }
  }

  // Find containing function
  const containingFunction = findContainingFunction(path);

  return {
    id,
    file: parsedFile.path,
    function: containingFunction,
    method: method as any,
    url,
    urlPattern,
    headers: Object.keys(headers).length > 0 ? headers : undefined,
    body,
    line: node.loc?.start.line || 0,
    column: node.loc?.start.column || 0,
    confidence: url ? 0.9 : 0.5, // Higher confidence for static URLs
  };
}

/**
 * Extract axios API call
 */
function extractAxiosCall(
  node: t.CallExpression,
  parsedFile: ParsedFile,
  path: NodePath<t.CallExpression>,
  id: string
): APICall | null {
  if (!t.isMemberExpression(node.callee)) {
    return null;
  }

  const memberExpr = node.callee;
  const method = t.isIdentifier(memberExpr.property)
    ? memberExpr.property.name.toUpperCase()
    : null;

  if (!method || !['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    return null;
  }

  // Check if object is axios or axios instance
  const isAxios =
    (t.isIdentifier(memberExpr.object) && memberExpr.object.name === 'axios') ||
    (t.isMemberExpression(memberExpr.object) &&
      t.isIdentifier(memberExpr.object.object) &&
      memberExpr.object.object.name === 'axios');

  if (!isAxios && node.arguments.length === 0) {
    return null;
  }

  const urlArg = node.arguments[0];
  let url: string | null = null;
  let urlPattern: string | undefined;
  const headers: Record<string, string> = {};
  let body: any = undefined;

  // Extract URL
  if (t.isStringLiteral(urlArg)) {
    url = urlArg.value;
  } else if (t.isTemplateLiteral(urlArg)) {
    urlPattern = extractTemplateString(urlArg);
    url = null;
  } else if (t.isExpression(urlArg)) {
    urlPattern = extractExpressionPattern(urlArg);
    url = null;
  } else {
    urlPattern = '[unknown]';
    url = null;
  }

  // Extract config (second argument for axios)
  if (node.arguments.length > 1 && t.isObjectExpression(node.arguments[1])) {
    const config = node.arguments[1];
    for (const prop of config.properties) {
      if (t.isObjectProperty(prop)) {
        const key = t.isIdentifier(prop.key) ? prop.key.name : null;

        if (key === 'headers' && t.isObjectExpression(prop.value)) {
          extractHeaders(prop.value, headers);
        } else if ((key === 'data' || key === 'body') && t.isExpression(prop.value)) {
          body = extractBody(prop.value);
        }
      }
    }
  }

  const containingFunction = findContainingFunction(path);

  return {
    id,
    file: parsedFile.path,
    function: containingFunction,
    method: method as any,
    url,
    urlPattern,
    headers: Object.keys(headers).length > 0 ? headers : undefined,
    body,
    line: node.loc?.start.line || 0,
    column: node.loc?.start.column || 0,
    confidence: url ? 0.9 : 0.5,
  };
}

/**
 * Extract GraphQL call
 */
function extractGraphQLCall(
  node: t.CallExpression,
  parsedFile: ParsedFile,
  path: NodePath<t.CallExpression>,
  id: string
): APICall | null {
  // Check for common GraphQL patterns:
  // - useQuery, useMutation (Apollo)
  // - fetch with GraphQL query string
  let isGraphQL = false;

  if (t.isIdentifier(node.callee)) {
    const name = node.callee.name;
    if (name === 'useQuery' || name === 'useMutation' || name === 'useLazyQuery') {
      isGraphQL = true;
    }
  } else if (t.isMemberExpression(node.callee)) {
    // client.query(), client.mutate()
    if (
      t.isIdentifier(node.callee.property) &&
      (node.callee.property.name === 'query' || node.callee.property.name === 'mutate')
    ) {
      isGraphQL = true;
    }
  }

  // Check for GraphQL query strings in fetch calls
  if (!isGraphQL && t.isIdentifier(node.callee) && node.callee.name === 'fetch') {
    // Look for GraphQL endpoint patterns
    if (node.arguments.length > 0) {
      const urlArg = node.arguments[0];
      if (t.isStringLiteral(urlArg)) {
        const url = urlArg.value.toLowerCase();
        if (url.includes('graphql') || url.includes('/api/graphql')) {
          isGraphQL = true;
        }
      }
    }
  }

  if (!isGraphQL) {
    return null;
  }

  const containingFunction = findContainingFunction(path);

  return {
    id,
    file: parsedFile.path,
    function: containingFunction,
    method: 'GRAPHQL',
    url: null,
    urlPattern: '/graphql',
    line: node.loc?.start.line || 0,
    column: node.loc?.start.column || 0,
    confidence: 0.7,
  };
}

/**
 * Extract template string pattern
 */
function extractTemplateString(node: t.TemplateLiteral): string {
  const parts: string[] = [];
  for (let i = 0; i < node.quasis.length; i++) {
    parts.push(node.quasis[i].value.raw);
    if (i < node.expressions.length) {
      parts.push('${...}'); // Placeholder for expression
    }
  }
  return parts.join('');
}

/**
 * Extract expression pattern (for variable references)
 */
function extractExpressionPattern(node: t.Expression): string {
  if (t.isIdentifier(node)) {
    return `[${node.name}]`;
  } else if (t.isMemberExpression(node)) {
    if (t.isIdentifier(node.object) && t.isIdentifier(node.property)) {
      return `[${node.object.name}.${node.property.name}]`;
    }
  }
  return '[dynamic]';
}

/**
 * Extract headers from object expression
 */
function extractHeaders(node: t.ObjectExpression, headers: Record<string, string>): void {
  for (const prop of node.properties) {
    if (t.isObjectProperty(prop)) {
      const key = t.isIdentifier(prop.key) ? prop.key.name : null;
      if (key && t.isStringLiteral(prop.value)) {
        headers[key] = prop.value.value;
      }
    }
  }
}

/**
 * Extract body from expression
 */
function extractBody(node: t.Expression): any {
  if (t.isStringLiteral(node)) {
    return node.value;
  } else if (t.isObjectExpression(node)) {
    const obj: Record<string, any> = {};
    for (const prop of node.properties) {
      if (t.isObjectProperty(prop)) {
        const key = t.isIdentifier(prop.key) ? prop.key.name : null;
        if (key && t.isStringLiteral(prop.value)) {
          obj[key] = prop.value.value;
        }
      }
    }
    return obj;
  }
  return undefined;
}

/**
 * Find containing function name using path
 */
function findContainingFunction(path: NodePath<t.CallExpression>): string | undefined {
  let currentPath: NodePath | null = path.parentPath;
  while (currentPath) {
    const node = currentPath.node;
    
    if (t.isFunctionDeclaration(node) && node.id) {
      return node.id.name;
    } else if (t.isFunctionExpression(node)) {
      // Check if assigned to variable
      const parentPath = currentPath.parentPath;
      if (parentPath && t.isVariableDeclarator(parentPath.node)) {
        const varDecl = parentPath.node;
        if (t.isIdentifier(varDecl.id)) {
          return varDecl.id.name;
        }
      }
      return 'anonymous';
    } else if (t.isArrowFunctionExpression(node)) {
      const parentPath = currentPath.parentPath;
      if (parentPath && t.isVariableDeclarator(parentPath.node)) {
        const varDecl = parentPath.node;
        if (t.isIdentifier(varDecl.id)) {
          return varDecl.id.name;
        }
      }
      return 'anonymous';
    }
    
    currentPath = currentPath.parentPath;
  }
  return undefined;
}

