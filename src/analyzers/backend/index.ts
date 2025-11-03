/**
 * Backend analyzer module
 */

export * from './parser';
export * from './endpoint-extractor';
export * from './query-detector';
export * from './service-detector';
export * from './graph-builder';
export { parseBackendFile, parsePythonFile } from './parser';
export { extractEndpoints } from './endpoint-extractor';
export { detectDatabaseQueries } from './query-detector';
export { detectServices } from './service-detector';
export { buildBackendDependencyGraph, detectCircularDependencies as detectBackendCircularDependencies } from './graph-builder';

