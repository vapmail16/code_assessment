/**
 * Unit tests for tech stack detection
 */

import { TechStackDetector } from '../../../src/detection/engine';
import { FileTree, FileNode } from '../../../src/types';
import { DetectionContext } from '../../../src/detection/engine';

describe('Tech Stack Detector', () => {
  let detector: TechStackDetector;

  beforeEach(() => {
    detector = new TechStackDetector();
  });

  test('should detect React frontend', () => {
    const packageJson = JSON.stringify({ dependencies: { react: '^18.0.0', 'react-dom': '^18.0.0' } });
    const fileNode: FileNode = {
      type: 'file',
      path: 'package.json',
      relativePath: 'package.json',
      name: 'package.json',
      size: packageJson.length,
      content: packageJson,
    };
    const fileTree: FileTree = {
      root: { type: 'directory', path: '.', relativePath: '', name: '.', size: 0 },
      files: new Map([['package.json', fileNode]]),
      totalFiles: 1,
      totalSize: packageJson.length,
    };

    const context: DetectionContext = {
      fileTree,
      configFiles: new Map(),
      entryPoints: [],
    };

    const result = detector.detectTechStack(context);

    expect(result.frontend).toBeDefined();
    expect(result.frontend?.length).toBeGreaterThan(0);
    expect(result.frontend?.[0]?.name.toLowerCase()).toContain('react');
  });

  test('should detect Express backend', () => {
    const packageJson = JSON.stringify({ dependencies: { express: '^4.18.0' } });
    const fileNode: FileNode = {
      type: 'file',
      path: 'package.json',
      relativePath: 'package.json',
      name: 'package.json',
      size: packageJson.length,
      content: packageJson,
    };
    const fileTree: FileTree = {
      root: { type: 'directory', path: '.', relativePath: '', name: '.', size: 0 },
      files: new Map([['package.json', fileNode]]),
      totalFiles: 1,
      totalSize: packageJson.length,
    };

    const context: DetectionContext = {
      fileTree,
      configFiles: new Map(),
      entryPoints: [],
    };

    const result = detector.detectTechStack(context);

    expect(result.backend).toBeDefined();
    expect(result.backend?.length).toBeGreaterThan(0);
    expect(result.backend?.[0]?.name.toLowerCase()).toContain('express');
  });

  test('should detect PostgreSQL database', () => {
    const packageJson = JSON.stringify({ dependencies: { pg: '^8.0.0' } });
    const fileNode: FileNode = {
      type: 'file',
      path: 'package.json',
      relativePath: 'package.json',
      name: 'package.json',
      size: packageJson.length,
      content: packageJson,
    };
    const fileTree: FileTree = {
      root: { type: 'directory', path: '.', relativePath: '', name: '.', size: 0 },
      files: new Map([['package.json', fileNode]]),
      totalFiles: 1,
      totalSize: packageJson.length,
    };

    const context: DetectionContext = {
      fileTree,
      configFiles: new Map(),
      entryPoints: [],
    };

    const result = detector.detectTechStack(context);

    expect(result.database).toBeDefined();
    expect(result.database?.length).toBeGreaterThan(0);
    expect(result.database?.some((db: any) => db.name.toLowerCase().includes('postgres'))).toBe(true);
  });

  test('should handle empty file tree', () => {
    const fileTree: FileTree = {
      root: { type: 'directory', path: '.', relativePath: '', name: '.', size: 0 },
      files: new Map(),
      totalFiles: 0,
      totalSize: 0,
    };

    const context: DetectionContext = {
      fileTree,
      configFiles: new Map(),
      entryPoints: [],
    };

    const result = detector.detectTechStack(context);

    expect(result).toBeDefined();
    expect(result).toHaveProperty('frontend');
    expect(result).toHaveProperty('backend');
  });
});

