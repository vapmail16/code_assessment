/**
 * Frontend analyzer module
 */

export * from './parser';
export * from './component-detector';
export * from './api-detector';
export * from './graph-builder';
export { parseFrontendFile } from './parser';
export { detectReactComponents } from './component-detector';
export { detectAPICalls } from './api-detector';
export { buildFrontendDependencyGraph, detectCircularDependencies } from './graph-builder';

