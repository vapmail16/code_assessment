/**
 * Connect backend endpoints to database queries
 */

import { Endpoint } from '../../types';
import { DatabaseQuery } from '../../types';
import { LineageEdge } from '../../types';

export interface BackendDatabaseMatch {
  endpoint: Endpoint;
  query: DatabaseQuery;
  confidence: number;
  reason: string;
}

/**
 * Match backend endpoints to database queries
 */
export function connectBackendToDatabase(
  endpoints: Endpoint[],
  queries: DatabaseQuery[]
): BackendDatabaseMatch[] {
  const matches: BackendDatabaseMatch[] = [];

  for (const endpoint of endpoints) {
    // Find queries in the same file
    const fileQueries = queries.filter((q) => q.file === endpoint.file);

    for (const query of fileQueries) {
      const match = matchEndpointToQuery(endpoint, query);
      if (match) {
        matches.push(match);
      }
    }

    // Also check queries in handler function
    if (endpoint.handler && endpoint.handler !== 'anonymous') {
      const handlerQueries = queries.filter((q) => q.function === endpoint.handler);
      for (const query of handlerQueries) {
        const match = matchEndpointToQuery(endpoint, query);
        if (match && !matches.some((m) => m.query.id === query.id && m.endpoint.id === endpoint.id)) {
          matches.push(match);
        }
      }
    }
  }

  return matches;
}

/**
 * Match endpoint to query
 */
function matchEndpointToQuery(
  endpoint: Endpoint,
  query: DatabaseQuery
): BackendDatabaseMatch | null {
  let confidence = 0;
  let reason = '';

  // Same file
  if (endpoint.file === query.file) {
    confidence += 0.4;
    reason = 'Same file';
  }

  // Same function/handler
  if (endpoint.handler === query.function) {
    confidence += 0.5;
    reason = reason ? `${reason}, same function` : 'Same function';
  }

  // Line proximity (query after endpoint definition)
  if (endpoint.line && query.line && endpoint.file === query.file) {
    const lineDiff = query.line - endpoint.line;
    if (lineDiff > 0 && lineDiff < 100) {
      confidence += 0.1;
      reason = reason ? `${reason}, nearby lines` : 'Nearby lines';
    }
  }

  if (confidence > 0) {
    return {
      endpoint,
      query,
      confidence: Math.min(1.0, confidence),
      reason,
    };
  }

  return null;
}

/**
 * Create lineage edges from matches
 */
export function createBackendDatabaseEdges(matches: BackendDatabaseMatch[]): LineageEdge[] {
  return matches.map((match) => {
    const endpointNodeId = `endpoint:${match.endpoint.id}`;
    const queryNodeId = `query:${match.query.id}`;

    return {
      id: `edge:${endpointNodeId}-${queryNodeId}`,
      from: endpointNodeId,
      to: queryNodeId,
      type: 'database-query',
      label: `${match.query.type} ${match.query.table || ''}`,
      confidence: match.confidence,
      data: {
        queryType: match.query.type,
        table: match.query.table,
        ormMethod: match.query.ormMethod,
        reason: match.reason,
      },
    };
  });
}

