/**
 * Backend API endpoint extraction
 */

import traverse, { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import { Endpoint, EndpointParameter } from '../../types';
import { ParsedFile } from '../../types';

/**
 * Extract API endpoints from backend code
 */
export function extractEndpoints(parsedFile: ParsedFile): Endpoint[] {
  const endpoints: Endpoint[] = [];

  if (!parsedFile.ast) {
    return endpoints;
  }

  const ast = parsedFile.ast as t.File;

  // Detect framework type
  const hasExpress = checkFramework(parsedFile, 'express');
  const hasFastify = checkFramework(parsedFile, 'fastify');
  const hasKoa = checkFramework(parsedFile, 'koa');

  if (hasExpress) {
    endpoints.push(...extractExpressRoutes(ast, parsedFile));
  } else if (hasFastify) {
    endpoints.push(...extractFastifyRoutes(ast, parsedFile));
  } else if (hasKoa) {
    endpoints.push(...extractKoaRoutes(ast, parsedFile));
  }

  return endpoints;
}

/**
 * Check if framework is used
 */
function checkFramework(parsedFile: ParsedFile, framework: string): boolean {
  for (const imp of parsedFile.imports) {
    if (imp.from.toLowerCase().includes(framework)) {
      return true;
    }
  }
  return false;
}

/**
 * Extract Express.js routes
 */
function extractExpressRoutes(ast: t.File, parsedFile: ParsedFile): Endpoint[] {
  const endpoints: Endpoint[] = [];
  let endpointId = 0;

  traverse(ast, {
    // app.get(), app.post(), etc.
    CallExpression(path) {
      const callExpr = path.node;

      if (t.isMemberExpression(callExpr.callee)) {
        const obj = callExpr.callee.object;
        const prop = callExpr.callee.property;

        // Check if it's app or router
        const isApp = (t.isIdentifier(obj) && (obj.name === 'app' || obj.name === 'router')) ||
                     (t.isMemberExpression(obj) && t.isIdentifier(obj.property) && obj.property.name === 'app');

        if (isApp && t.isIdentifier(prop)) {
          const method = prop.name.toLowerCase();
          if (['get', 'post', 'put', 'delete', 'patch', 'all'].includes(method)) {
            const endpoint = extractExpressEndpoint(
              callExpr,
              method.toUpperCase(),
              parsedFile,
              path,
              `express-${++endpointId}`
            );
            if (endpoint) {
              endpoints.push(endpoint);
            }
          }
        }

        // router.route().get().post()
        if (t.isIdentifier(prop) && prop.name === 'route' && isApp) {
          extractChainedRoutes(callExpr, parsedFile, path, endpoints, `express-${++endpointId}`);
        }
      }
    },
  });

  return endpoints;
}

/**
 * Extract Express endpoint from app.method() call
 */
function extractExpressEndpoint(
  node: t.CallExpression,
  method: string,
  parsedFile: ParsedFile,
  path: NodePath<t.CallExpression>,
  id: string
): Endpoint | null {
  if (node.arguments.length === 0) {
    return null;
  }

  const pathArg = node.arguments[0];
  let routePath = '';
  let pathPattern = '';

  // Extract path
  if (t.isStringLiteral(pathArg)) {
    routePath = pathArg.value;
    pathPattern = normalizePath(routePath);
  } else if (t.isTemplateLiteral(pathArg)) {
    routePath = extractTemplateString(pathArg);
    pathPattern = routePath;
  } else {
    return null; // Dynamic path - skip for now
  }

  // Extract parameters from path
  const parameters = extractPathParameters(routePath);

  // Find handler function (usually last argument)
  let handler = 'anonymous';
  const handlerArg = node.arguments[node.arguments.length - 1];
  if (t.isIdentifier(handlerArg)) {
    handler = handlerArg.name;
  } else if (t.isFunctionExpression(handlerArg) || t.isArrowFunctionExpression(handlerArg)) {
    handler = 'anonymous';
  }

  // Extract middleware (arguments between path and handler)
  const middleware: string[] = [];
  for (let i = 1; i < node.arguments.length - 1; i++) {
    const arg = node.arguments[i];
    if (t.isIdentifier(arg)) {
      middleware.push(arg.name);
    }
  }

  return {
    id,
    file: parsedFile.path,
    method: method as any,
    path: routePath,
    pathPattern,
    handler,
    line: node.loc?.start.line || 0,
    parameters,
    middleware,
  };
}

/**
 * Extract chained routes (router.route().get().post())
 */
function extractChainedRoutes(
  routeCall: t.CallExpression,
  parsedFile: ParsedFile,
  path: NodePath<t.CallExpression>,
  endpoints: Endpoint[],
  baseId: string
): void {
  if (routeCall.arguments.length === 0 || !t.isStringLiteral(routeCall.arguments[0])) {
    return;
  }

  const basePath = routeCall.arguments[0].value;

  // Look for method calls on the result of route()
  // This is simplified - in reality, we'd need to track the return value
  let currentPath: NodePath | null = path.parentPath;
  let idCounter = 0;

  while (currentPath && idCounter < 10) {
    if (t.isCallExpression(currentPath.node)) {
      const callExpr = currentPath.node;
      if (t.isMemberExpression(callExpr.callee) && t.isIdentifier(callExpr.callee.property)) {
        const method = callExpr.callee.property.name.toUpperCase();
        if (['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'ALL'].includes(method)) {
          const endpoint = extractExpressEndpoint(
            callExpr,
            method,
            parsedFile,
            currentPath as NodePath<t.CallExpression>,
            `${baseId}-${++idCounter}`
          );
          if (endpoint) {
            endpoint.path = basePath;
            endpoint.pathPattern = normalizePath(basePath);
            endpoints.push(endpoint);
          }
        }
      }
    }
    currentPath = currentPath.parentPath;
    idCounter++;
  }
}

/**
 * Extract Fastify routes (simplified - similar to Express)
 */
function extractFastifyRoutes(ast: t.File, parsedFile: ParsedFile): Endpoint[] {
  // Fastify uses similar patterns to Express
  return extractExpressRoutes(ast, parsedFile);
}

/**
 * Extract Koa routes
 */
function extractKoaRoutes(ast: t.File, parsedFile: ParsedFile): Endpoint[] {
  const endpoints: Endpoint[] = [];
  let endpointId = 0;

  // Koa uses router.get(), router.post(), etc. similar to Express
  traverse(ast, {
    CallExpression(path) {
      const callExpr = path.node;
      if (t.isMemberExpression(callExpr.callee)) {
        const obj = callExpr.callee.object;
        const prop = callExpr.callee.property;

        if (
          (t.isIdentifier(obj) && obj.name === 'router') &&
          t.isIdentifier(prop) &&
          ['get', 'post', 'put', 'delete', 'patch', 'all'].includes(prop.name.toLowerCase())
        ) {
          const method = prop.name.toUpperCase();
          const endpoint = extractExpressEndpoint(
            callExpr,
            method,
            parsedFile,
            path,
            `koa-${++endpointId}`
          );
          if (endpoint) {
            endpoints.push(endpoint);
          }
        }
      }
    },
  });

  return endpoints;
}

/**
 * Normalize path pattern
 */
function normalizePath(path: string): string {
  // Convert Express params :id to pattern
  return path.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, '{param}');
}

/**
 * Extract path parameters
 */
function extractPathParameters(path: string): EndpointParameter[] {
  const parameters: EndpointParameter[] = [];
  const paramRegex = /:([a-zA-Z_][a-zA-Z0-9_]*)/g;
  let match;

  while ((match = paramRegex.exec(path)) !== null) {
    parameters.push({
      name: match[1],
      type: 'path',
      required: true,
    });
  }

  return parameters;
}

/**
 * Extract template string
 */
function extractTemplateString(node: t.TemplateLiteral): string {
  const parts: string[] = [];
  for (let i = 0; i < node.quasis.length; i++) {
    parts.push(node.quasis[i].value.raw);
    if (i < node.expressions.length) {
      parts.push('${...}');
    }
  }
  return parts.join('');
}

