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
    const fileTree: FileTree = {
      files: new Map([
        [
          'package.json',
          {
            type: 'file',
            path: 'package.json',
            name: 'package.json',
            content: JSON.stringify({
              dependencies: {
                react: '^18.0.0',
                'react-dom': '^18.0.0',
              },
            }),
          } as FileNode,
        ],
      ]),
    };

    const context: DetectionContext = {
      fileTree,
      configFiles: new Map(),
      entryPoints: [],
    };

    const result = detector.detectTechStack(context);

    expect(result.frontend).toBeDefined();
    expect(result.frontend?.name.toLowerCase()).toContain('react');
  });

  test('should detect Express backend', () => {
    const fileTree: FileTree = {
      files: new Map([
        [
          'package.json',
          {
            type: 'file',
            path: 'package.json',
            name: 'package.json',
            content: JSON.stringify({
              dependencies: {
                express: '^4.18.0',
              },
            }),
          } as FileNode,
        ],
      ]),
    };

    const context: DetectionContext = {
      fileTree,
      configFiles: new Map(),
      entryPoints: [],
    };

    const result = detector.detectTechStack(context);

    expect(result.backend).toBeDefined();
    expect(result.backend?.name.toLowerCase()).toContain('express');
  });

  test('should detect PostgreSQL database', () => {
    const fileTree: FileTree = {
      files: new Map([
        [
          'package.json',
          {
            type: 'file',
            path: 'package.json',
            name: 'package.json',
            content: JSON.stringify({
              dependencies: {
                pg: '^8.0.0',
              },
            }),
          } as FileNode,
        ],
      ]),
    };

    const context: DetectionContext = {
      fileTree,
      configFiles: new Map(),
      entryPoints: [],
    };

    const result = detector.detectTechStack(context);

    expect(result.databases.length).toBeGreaterThan(0);
    expect(result.databases.some((db) => db.name.toLowerCase().includes('postgres'))).toBe(true);
  });

  test('should handle empty file tree', () => {
    const fileTree: FileTree = {
      files: new Map(),
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

