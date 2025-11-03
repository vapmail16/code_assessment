/**
 * Lineage graph types
 */

export interface LineageGraph {
  nodes: LineageNode[];
  edges: LineageEdge[];
  layers: {
    frontend: LineageNode[];
    backend: LineageNode[];
    database: LineageNode[];
  };
  metadata: GraphMetadata;
}

export interface LineageNode {
  id: string;
  type: LineageNodeType;
  layer: 'frontend' | 'backend' | 'database';
  label: string;
  file: string;
  line?: number;
  data: NodeData;
}

export type LineageNodeType =
  | 'component'      // Frontend component
  | 'page'           // Frontend page/route
  | 'api-call'       // Frontend API call point
  | 'endpoint'       // Backend API endpoint
  | 'service'        // Backend service
  | 'controller'     // Backend controller
  | 'database-query' // Backend database query
  | 'table'          // Database table
  | 'schema';        // Database schema

export interface NodeData {
  // Component data
  componentName?: string;
  props?: string[];
  
  // Endpoint data
  httpMethod?: string;
  path?: string;
  parameters?: string[];
  
  // Table data
  tableName?: string;
  columns?: string[];
  
  // Generic metadata
  [key: string]: any;
}

export interface LineageEdge {
  id: string;
  from: string; // Node ID
  to: string; // Node ID
  type: LineageEdgeType;
  label?: string;
  confidence: number; // 0-1, confidence in connection
  data: EdgeData;
}

export type LineageEdgeType =
  | 'api-call'        // Frontend → Backend API call
  | 'database-query'  // Backend → Database query
  | 'data-flow'       // Generic data flow
  | 'navigation'      // Frontend route navigation
  | 'dependency';     // Code dependency

export interface EdgeData {
  // API call data
  method?: string;
  url?: string;
  statusCode?: number;
  
  // Database query data
  queryType?: string;
  table?: string;
  
  // Generic metadata
  [key: string]: any;
}

export interface GraphMetadata {
  totalNodes: number;
  totalEdges: number;
  nodeCounts: Record<LineageNodeType, number>;
  edgeCounts: Record<LineageEdgeType, number>;
  confidence: {
    average: number;
    min: number;
    max: number;
    distribution: number[]; // Histogram of confidence scores
  };
  disconnectedComponents: number;
  longestPath: number;
}

