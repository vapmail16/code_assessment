/**
 * Database usage mapping - connect backend queries to database tables
 */

import { TableUsageMap, DatabaseQuery, Endpoint } from '../../types';
import { DatabaseSchema } from '../../types';

/**
 * Map database usage from queries and endpoints
 */
export function mapDatabaseUsage(
  schema: DatabaseSchema,
  queries: DatabaseQuery[],
  endpoints: Endpoint[]
): TableUsageMap {
  const usageMap: TableUsageMap = {};

  // Initialize usage map for all tables
  for (const table of schema.tables) {
    usageMap[table.name] = {
      endpoints: [],
      queries: [],
      readOperations: 0,
      writeOperations: 0,
    };
  }

  // Map queries to tables
  for (const query of queries) {
    if (query.table) {
      const tableName = query.table.toLowerCase();
      if (usageMap[tableName]) {
        usageMap[tableName].queries.push(query.id);

        // Count operations
        if (query.type === 'select') {
          usageMap[tableName].readOperations++;
        } else {
          usageMap[tableName].writeOperations++;
        }

        // Find which endpoint uses this query
        const endpoint = findEndpointForQuery(query, endpoints);
        if (endpoint && !usageMap[tableName].endpoints.includes(endpoint.id)) {
          usageMap[tableName].endpoints.push(endpoint.id);
        }
      }
    }

    // Handle queries with multiple tables
    if (query.tables && query.tables.length > 0) {
      for (const tableName of query.tables) {
        const normalizedName = tableName.toLowerCase();
        if (usageMap[normalizedName]) {
          if (!usageMap[normalizedName].queries.includes(query.id)) {
            usageMap[normalizedName].queries.push(query.id);
          }

          if (query.type === 'select') {
            usageMap[normalizedName].readOperations++;
          } else {
            usageMap[normalizedName].writeOperations++;
          }

          const endpoint = findEndpointForQuery(query, endpoints);
          if (endpoint && !usageMap[normalizedName].endpoints.includes(endpoint.id)) {
            usageMap[normalizedName].endpoints.push(endpoint.id);
          }
        }
      }
    }
  }

  return usageMap;
}

/**
 * Find endpoint that uses a query
 */
function findEndpointForQuery(query: DatabaseQuery, endpoints: Endpoint[]): Endpoint | null {
  // Find endpoint in the same file
  for (const endpoint of endpoints) {
    if (endpoint.file === query.file) {
      // Check if query is in the same function or nearby
      if (query.function === endpoint.handler || !query.function) {
        return endpoint;
      }

      // If query line is after endpoint line and within reasonable distance
      if (query.line && endpoint.line && query.line > endpoint.line && query.line < endpoint.line + 50) {
        return endpoint;
      }
    }
  }

  return null;
}

/**
 * Get table access summary
 */
export function getTableAccessSummary(
  usageMap: TableUsageMap,
  tableName: string
): {
  totalQueries: number;
  totalEndpoints: number;
  readCount: number;
  writeCount: number;
  endpoints: string[];
  queries: string[];
} {
  const usage = usageMap[tableName.toLowerCase()];

  if (!usage) {
    return {
      totalQueries: 0,
      totalEndpoints: 0,
      readCount: 0,
      writeCount: 0,
      endpoints: [],
      queries: [],
    };
  }

  return {
    totalQueries: usage.queries.length,
    totalEndpoints: usage.endpoints.length,
    readCount: usage.readOperations,
    writeCount: usage.writeOperations,
    endpoints: [...usage.endpoints],
    queries: [...usage.queries],
  };
}
