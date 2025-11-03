/**
 * Lineage graph module
 */

export * from './connectors/frontend-backend';
export * from './connectors/backend-database';
export * from './matcher';
export * from './graph-builder';
export {
  connectFrontendToBackend,
  createFrontendBackendEdges,
} from './connectors/frontend-backend';
export {
  connectBackendToDatabase,
  createBackendDatabaseEdges,
} from './connectors/backend-database';
export { buildLineageGraph, connectFrontendBackendInGraph } from './graph-builder';
export type { LineageGraphContext } from './graph-builder';

