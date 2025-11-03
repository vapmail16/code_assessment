/**
 * Database usage mapping - connects backend code to database tables
 */

import { TableUsageMap } from '../../types';
import { Endpoint, DatabaseQuery } from '../../types';
import { Table } from '../../types';

/**
 * Map database usage from queries and endpoints
 */
export function mapDatabaseUsage(
  tables: Table[],
  queries: DatabaseQuery[],
  endpoints: Endpoint[]
): TableUsageMap {
  const usageMap: TableUsageMap = {};

  // Initialize map for all tables
  for (const table of tables) {
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

        // Link to endpoints that contain this query
        const endpoint = findEndpointContainingQuery(query, endpoints);
        if (endpoint && !usageMap[tableName].endpoints.includes(endpoint.id)) {
          usageMap[tableName].endpoints.push(endpoint.id);
        }
      }
    }

    // Also check tables array for queries that affect multiple tables
    if (query.tables) {
      for (const tableName of query.tables) {
        const lowerTableName = tableName.toLowerCase();
        if (usageMap[lowerTableName]) {
          usageMap[lowerTableName].queries.push(query.id);

          if (query.type === 'select') {
            usageMap[lowerTableName].readOperations++;
          } else {
            usageMap[lowerTableName].writeOperations++;
          }
        }
      }
    }
  }

  return usageMap;
}

/**
 * Find endpoint that contains a query
 */
function findEndpointContainingQuery(
  query: DatabaseQuery,
  endpoints: Endpoint[]
): Endpoint | undefined {
  // Simple heuristic: find endpoint in the same file, or closest line number
  const sameFileEndpoints = endpoints.filter((e) => e.file === query.file);

  if (sameFileEndpoints.length === 0) {
    return undefined;
  }

  if (sameFileEndpoints.length === 1) {
    return sameFileEndpoints[0];
  }

  // Find endpoint with closest line number
  let closestEndpoint = sameFileEndpoints[0];
  let minDistance = Math.abs((closestEndpoint.line || 0) - (query.line || 0));

  for (const endpoint of sameFileEndpoints) {
    const distance = Math.abs((endpoint.line || 0) - (query.line || 0));
    if (distance < minDistance) {
      minDistance = distance;
      closestEndpoint = endpoint;
    }
  }

  return closestEndpoint;
}

/**
 * Get tables accessed by an endpoint
 */
export function getTablesForEndpoint(
  endpoint: Endpoint,
  queries: DatabaseQuery[]
): string[] {
  const tables: string[] = [];
  const endpointQueries = queries.filter((q) => q.file === endpoint.file);

  for (const query of endpointQueries) {
    if (query.table && !tables.includes(query.table)) {
      tables.push(query.table);
    }
    if (query.tables) {
      for (const table of query.tables) {
        if (!tables.includes(table)) {
          tables.push(table);
        }
      }
    }
  }

  return tables;
}

/**
 * Get endpoints that use a table
 */
export function getEndpointsForTable(
  tableName: string,
  usageMap: TableUsageMap,
  endpoints: Endpoint[]
): Endpoint[] {
  const tableUsage = usageMap[tableName.toLowerCase()];
  if (!tableUsage) {
    return [];
  }

  return endpoints.filter((e) => tableUsage.endpoints.includes(e.id));
}

