/**
 * Graph data exporter for visualization
 */

import { LineageGraph } from '../types';

export interface VisualizationNode {
  id: string;
  label: string;
  type: string;
  layer: string;
  file?: string;
  line?: number;
  group?: string; // For color grouping
  shape?: string; // For node shapes
  size?: number;
  metadata?: Record<string, any>;
}

export interface VisualizationEdge {
  id: string;
  from: string;
  to: string;
  label?: string;
  type: string;
  color?: string;
  style?: string; // 'solid', 'dashed', 'dotted'
  width?: number;
  confidence?: number;
}

export interface VisualizationData {
  nodes: VisualizationNode[];
  edges: VisualizationEdge[];
  metadata: {
    totalNodes: number;
    totalEdges: number;
    layers: {
      frontend: number;
      backend: number;
      database: number;
    };
  };
}

/**
 * Export lineage graph to visualization format
 */
export function exportGraphForVisualization(graph: LineageGraph): VisualizationData {
  const nodes: VisualizationNode[] = [];
  const edges: VisualizationEdge[] = [];

  // Convert nodes
  for (const node of graph.nodes) {
    nodes.push({
      id: node.id,
      label: node.label,
      type: node.type,
      layer: node.layer || 'unknown',
      file: node.file,
      line: node.line,
      group: getNodeGroup(node.layer || 'unknown'),
      shape: getNodeShape(node.type),
      size: getNodeSize(node.type),
      metadata: node.data || {},
    });
  }

  // Convert edges
  for (const edge of graph.edges) {
    edges.push({
      id: edge.id,
      from: edge.from,
      to: edge.to,
      label: edge.label,
      type: edge.type,
      color: getEdgeColor(edge.type),
      style: getEdgeStyle(edge.type),
      width: getEdgeWidth(edge.confidence || 1.0),
      confidence: edge.confidence,
    });
  }

  return {
    nodes,
    edges,
    metadata: {
      totalNodes: nodes.length,
      totalEdges: edges.length,
      layers: {
        frontend: graph.layers.frontend.length,
        backend: graph.layers.backend.length,
        database: graph.layers.database.length,
      },
    },
  };
}

/**
 * Get node group for color coding
 */
function getNodeGroup(layer: string): string {
  switch (layer) {
    case 'frontend':
      return 'frontend';
    case 'backend':
      return 'backend';
    case 'database':
      return 'database';
    default:
      return 'other';
  }
}

/**
 * Get node shape based on type
 */
function getNodeShape(type: string): string {
  switch (type) {
    case 'component':
    case 'page':
      return 'box';
    case 'api-call':
      return 'ellipse';
    case 'endpoint':
      return 'diamond';
    case 'table':
      return 'database';
    case 'database-query':
      return 'triangle';
    default:
      return 'circle';
  }
}

/**
 * Get node size based on type
 */
function getNodeSize(type: string): number {
  switch (type) {
    case 'table':
      return 40;
    case 'endpoint':
      return 35;
    case 'component':
      return 30;
    case 'api-call':
      return 25;
    default:
      return 20;
  }
}

/**
 * Get edge color based on type
 */
function getEdgeColor(type: string): string {
  switch (type) {
    case 'api-call':
      return '#4CAF50'; // Green
    case 'database-query':
      return '#FF9800'; // Orange
    case 'data-flow':
      return '#2196F3'; // Blue
    case 'dependency':
      return '#9E9E9E'; // Grey
    case 'import':
      return '#795548'; // Brown
    default:
      return '#000000'; // Black
  }
}

/**
 * Get edge style based on type
 */
function getEdgeStyle(type: string): string {
  switch (type) {
    case 'data-flow':
      return 'dashed';
    case 'dependency':
      return 'dotted';
    default:
      return 'solid';
  }
}

/**
 * Get edge width based on confidence
 */
function getEdgeWidth(confidence: number): number {
  // Scale width from 1-5 based on confidence (0-1)
  return Math.max(1, Math.min(5, Math.ceil(confidence * 5)));
}

/**
 * Export to JSON format (for tools like vis.js, D3.js, Cytoscape)
 */
export function exportToJSON(graph: LineageGraph, pretty = false): string {
  const data = exportGraphForVisualization(graph);
  return pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
}

/**
 * Export to Cytoscape format
 */
export function exportToCytoscape(graph: LineageGraph): any {
  const visualization = exportGraphForVisualization(graph);

  return {
    elements: {
      nodes: visualization.nodes.map((node) => ({
        data: {
          id: node.id,
          label: node.label,
          type: node.type,
          layer: node.layer,
          file: node.file,
          line: node.line,
          ...node.metadata,
        },
        classes: `${node.layer} ${node.type}`,
      })),
      edges: visualization.edges.map((edge) => ({
        data: {
          id: edge.id,
          source: edge.from,
          target: edge.to,
          label: edge.label || '',
          type: edge.type,
          confidence: edge.confidence || 1.0,
        },
        classes: edge.type,
      })),
    },
    style: generateCytoscapeStyle(),
  };
}

/**
 * Generate Cytoscape style sheet
 */
function generateCytoscapeStyle(): any[] {
  return [
    {
      selector: 'node',
      style: {
        'background-color': '#666',
        'label': 'data(label)',
        'text-valign': 'center',
        'text-halign': 'center',
        'width': 30,
        'height': 30,
      },
    },
    {
      selector: 'node[layer = "frontend"]',
      style: {
        'background-color': '#4CAF50',
        'shape': 'rectangle',
      },
    },
    {
      selector: 'node[layer = "backend"]',
      style: {
        'background-color': '#2196F3',
        'shape': 'ellipse',
      },
    },
    {
      selector: 'node[layer = "database"]',
      style: {
        'background-color': '#FF9800',
        'shape': 'diamond',
      },
    },
    {
      selector: 'edge',
      style: {
        'width': 2,
        'line-color': '#999',
        'target-arrow-color': '#999',
        'target-arrow-shape': 'triangle',
        'curve-style': 'bezier',
      },
    },
    {
      selector: 'edge[type = "api-call"]',
      style: {
        'line-color': '#4CAF50',
        'width': 3,
      },
    },
    {
      selector: 'edge[type = "database-query"]',
      style: {
        'line-color': '#FF9800',
        'width': 3,
      },
    },
  ];
}

/**
 * Export to GraphML format (for yEd, Gephi, etc.)
 */
export function exportToGraphML(graph: LineageGraph): string {
  const visualization = exportGraphForVisualization(graph);

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<graphml xmlns="http://graphml.graphdrawing.org/xmlns">\n';
  xml += '  <key id="layer" for="node" attr.name="layer" attr.type="string"/>\n';
  xml += '  <key id="type" for="node" attr.name="type" attr.type="string"/>\n';
  xml += '  <key id="file" for="node" attr.name="file" attr.type="string"/>\n';
  xml += '  <key id="edgeType" for="edge" attr.name="type" attr.type="string"/>\n';
  xml += '  <graph id="lineage" edgedefault="directed">\n';

  // Add nodes
  for (const node of visualization.nodes) {
    xml += `    <node id="${escapeXml(node.id)}">\n`;
    xml += `      <data key="layer">${escapeXml(node.layer)}</data>\n`;
    xml += `      <data key="type">${escapeXml(node.type)}</data>\n`;
    if (node.file) {
      xml += `      <data key="file">${escapeXml(node.file)}</data>\n`;
    }
    xml += `      <data key="label">${escapeXml(node.label)}</data>\n`;
    xml += '    </node>\n';
  }

  // Add edges
  for (const edge of visualization.edges) {
    xml += `    <edge id="${escapeXml(edge.id)}" source="${escapeXml(edge.from)}" target="${escapeXml(edge.to)}">\n`;
    xml += `      <data key="edgeType">${escapeXml(edge.type)}</data>\n`;
    if (edge.label) {
      xml += `      <data key="label">${escapeXml(edge.label)}</data>\n`;
    }
    xml += '    </edge>\n';
  }

  xml += '  </graph>\n';
  xml += '</graphml>';

  return xml;
}

/**
 * Escape XML special characters
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

