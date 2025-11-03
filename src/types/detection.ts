/**
 * Tech stack detection types
 */

export interface TechStack {
  frontend?: Framework[];
  backend?: Framework[];
  database?: Database[];
  buildTools?: BuildTool[];
  testing?: TestingTool[];
  overallConfidence: number; // 0-1
  detectedAt: Date;
}

export interface Framework {
  name: string;
  type: 'frontend' | 'backend' | 'database' | 'build' | 'test';
  version?: string;
  confidence: number; // 0-1
  indicators: DetectionIndicator[];
  files: string[]; // Files that indicate this framework
}

export interface DetectionIndicator {
  type: 'package-file' | 'import' | 'config-file' | 'file-extension' | 'pattern';
  value: string;
  confidence: number;
  source: string; // File or pattern where found
}

export interface Database {
  name: string;
  type: 'relational' | 'nosql' | 'graph' | 'key-value';
  orm?: string; // e.g., 'sequelize', 'prisma', 'sqlalchemy'
  version?: string;
  confidence: number;
  connectionString?: string; // If found in config
}

export interface BuildTool {
  name: string;
  type: 'package-manager' | 'bundler' | 'compiler';
  version?: string;
  configFiles: string[];
}

export interface TestingTool {
  name: string;
  framework?: string; // e.g., 'jest', 'pytest'
  version?: string;
  configFiles: string[];
}

