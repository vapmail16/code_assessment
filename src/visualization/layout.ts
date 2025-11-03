/**
 * Graph layout algorithms
 */

import { LineageNode, LineageGraph } from '../types';
import { VisualizationNode } from './exporter';

export interface NodePosition {
  id: string;
  x: number;
  y: number;
  level?: number; // For hierarchical layouts
}

export interface LayoutOptions {
  width: number;
  height: number;
  nodeSpacing: number;
  layerSpacing: number;
}

/**
 * Calculate hierarchical layout (layers from left to right)
 */
export function calculateHierarchicalLayout(
  graph: LineageGraph,
  options: LayoutOptions = {
    width: 1000,
    height: 800,
    nodeSpacing: 100,
    layerSpacing: 200,
  }
): NodePosition[] {
  const positions: NodePosition[] = [];
  const layers = ['frontend', 'backend', 'database'];

  // Group nodes by layer
  const nodesByLayer: Record<string, LineageNode[]> = {
    frontend: [],
    backend: [],
    database: [],
    unknown: [],
  };

  for (const node of graph.nodes) {
    const layer = node.layer || 'unknown';
    if (!nodesByLayer[layer]) {
      nodesByLayer[layer] = [];
    }
    nodesByLayer[layer].push(node);
  }

  // Calculate positions for each layer
  let xOffset = options.nodeSpacing;
  for (let layerIndex = 0; layerIndex < layers.length; layerIndex++) {
    const layer = layers[layerIndex];
    const nodes = nodesByLayer[layer] || [];

    if (nodes.length === 0) {
      continue;
    }

    const layerHeight = Math.max(
      options.height,
      nodes.length * options.nodeSpacing
    );
    const yStart = (options.height - layerHeight) / 2;
    const ySpacing = layerHeight / (nodes.length + 1);

    for (let i = 0; i < nodes.length; i++) {
      positions.push({
        id: nodes[i].id,
        x: xOffset,
        y: yStart + (i + 1) * ySpacing,
        level: layerIndex,
      });
    }

    xOffset += options.layerSpacing;
  }

  // Handle unknown layer nodes
  if (nodesByLayer.unknown.length > 0) {
    const unknownNodes = nodesByLayer.unknown;
    const ySpacing = options.height / (unknownNodes.length + 1);

    for (let i = 0; i < unknownNodes.length; i++) {
      positions.push({
        id: unknownNodes[i].id,
        x: xOffset,
        y: (i + 1) * ySpacing,
        level: 3,
      });
    }
  }

  return positions;
}

/**
 * Calculate force-directed layout (simplified - would use actual physics in real implementation)
 */
export function calculateForceDirectedLayout(
  graph: LineageGraph,
  options: LayoutOptions = {
    width: 1000,
    height: 800,
    nodeSpacing: 100,
    layerSpacing: 150,
  }
): NodePosition[] {
  // Simplified force-directed layout
  // In production, would use d3-force or similar library

  const positions: NodePosition[] = [];
  const nodes = graph.nodes;

  // Initialize random positions
  for (const node of nodes) {
    positions.push({
      id: node.id,
      x: Math.random() * options.width,
      y: Math.random() * options.height,
    });
  }

  // Simple iteration to separate nodes
  // This is a very basic implementation - real force-directed would have:
  // - Attraction forces between connected nodes
  // - Repulsion forces between all nodes
  // - Multiple iterations until convergence

  return positions;
}

/**
 * Calculate circular layout
 */
export function calculateCircularLayout(
  graph: LineageGraph,
  options: LayoutOptions = {
    width: 800,
    height: 800,
    nodeSpacing: 50,
    layerSpacing: 100,
  }
): NodePosition[] {
  const positions: NodePosition[] = [];
  const nodes = graph.nodes;
  const centerX = options.width / 2;
  const centerY = options.height / 2;
  const radius = Math.min(options.width, options.height) / 3;

  const angleStep = (2 * Math.PI) / nodes.length;

  for (let i = 0; i < nodes.length; i++) {
    const angle = i * angleStep;
    positions.push({
      id: nodes[i].id,
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
    });
  }

  return positions;
}

/**
 * Calculate grid layout
 */
export function calculateGridLayout(
  graph: LineageGraph,
  options: LayoutOptions = {
    width: 1000,
    height: 800,
    nodeSpacing: 150,
    layerSpacing: 200,
  }
): NodePosition[] {
  const positions: NodePosition[] = [];
  const nodes = graph.nodes;

  // Calculate grid dimensions
  const cols = Math.ceil(Math.sqrt(nodes.length));
  const rows = Math.ceil(nodes.length / cols);

  const cellWidth = options.width / cols;
  const cellHeight = options.height / rows;

  for (let i = 0; i < nodes.length; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;
    positions.push({
      id: nodes[i].id,
      x: col * cellWidth + cellWidth / 2,
      y: row * cellHeight + cellHeight / 2,
    });
  }

  return positions;
}

/**
 * Apply positions to visualization nodes
 */
export function applyPositions(
  nodes: VisualizationNode[],
  positions: NodePosition[]
): VisualizationNode[] {
  const positionMap = new Map<string, NodePosition>();
  for (const pos of positions) {
    positionMap.set(pos.id, pos);
  }

  return nodes.map((node) => {
    const pos = positionMap.get(node.id);
    if (pos) {
      return {
        ...node,
        x: pos.x,
        y: pos.y,
        level: pos.level,
      };
    }
    return node;
  });
}

