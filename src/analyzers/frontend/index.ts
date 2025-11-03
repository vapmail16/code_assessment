/**
 * Frontend analyzer module
 */

export * from './parser';
export * from './component-detector';
export * from './api-detector';
export { parseFrontendFile } from './parser';
export { detectReactComponents } from './component-detector';
export { detectAPICalls } from './api-detector';
export { buildFrontendDependencyGraph, detectCircularDependencies as detectFrontendCircularDependencies } from './graph-builder';
export type { FrontendGraphContext } from './graph-builder';

