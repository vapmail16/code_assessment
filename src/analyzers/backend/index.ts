/**
 * Backend analyzer module
 */

export * from './parser';
export * from './endpoint-extractor';
export * from './query-detector';
export * from './service-detector';
export * from './graph-builder';
export * from './graphql-detector';

export { parseBackendFile, parsePythonFile } from './parser';
export { extractEndpoints } from './endpoint-extractor';
export { detectDatabaseQueries } from './query-detector';
export { detectServiceComponents } from './service-detector';
export { buildBackendDependencyGraph } from './graph-builder';
export { detectGraphQLResolvers, parseGraphQLSchema, findGraphQLSchemaFiles } from './graphql-detector';
