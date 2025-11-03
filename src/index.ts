/**
 * Main entry point for Code Assessment & Lineage Platform
 */

export * from './types';
export * from './github';
export * from './detection';
export * from './analyzers/frontend';
export * from './analyzers/backend';
export * from './analyzers/database';
export * from './lineage';
export * from './assessment';
export * from './reporting';

// Re-export specific functions to avoid conflicts
export { detectFrontendCircularDependencies } from './analyzers/frontend';
export { detectBackendCircularDependencies } from './analyzers/backend';

// Main entry point - will be expanded as features are implemented
export function main(): void {
  // Placeholder - will be implemented in future sections
}

