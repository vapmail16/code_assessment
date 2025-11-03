/**
 * Common/shared types
 */

export interface Position {
  line: number;
  column: number;
}

export interface Range {
  start: Position;
  end: Position;
}

export interface Location {
  file: string;
  range?: Range;
  line?: number;
  column?: number;
}

export interface Confidence {
  value: number; // 0-1
  factors: ConfidenceFactor[];
}

export interface ConfidenceFactor {
  type: string;
  description: string;
  contribution: number; // How much this factor contributes
}

export interface Error {
  code: string;
  message: string;
  location?: Location;
  stack?: string;
  context?: Record<string, any>;
}

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export interface Metadata {
  [key: string]: any;
}

