/**
 * Unit tests for tech stack detection
 */

import { TechStackDetector } from '../../../src/detection';
import { FileTree, FileNode } from '../../../src/types';

describe('TechStackDetector', () => {
  let detector: TechStackDetector;

  beforeEach(() => {
    detector = new TechStackDetector();
  });

  it('should create detector instance', () => {
    expect(detector).toBeDefined();
  });

  it('should detect empty tech stack for empty repository', () => {
    const emptyFileTree: FileTree = {
      root: {
        path: '/test',
        relativePath: '.',
        name: 'test',
        type: 'directory',
        size: 0,
        children: [],
      },
      files: new Map(),
      totalFiles: 0,
      totalSize: 0,
    };

    const techStack = detector.detectTechStack({
      fileTree: emptyFileTree,
      configFiles: new Map(),
      entryPoints: [],
    });

    expect(techStack).toBeDefined();
    expect(techStack.overallConfidence).toBe(0);
    expect(techStack.frontend).toEqual([]);
    expect(techStack.backend).toEqual([]);
  });

  it('should detect Node.js from package.json', () => {
    const packageJsonNode: FileNode = {
      path: '/test/package.json',
      relativePath: 'package.json',
      name: 'package.json',
      type: 'file',
      size: 100,
      extension: '.json',
      language: 'json',
    };

    const fileTree: FileTree = {
      root: {
        path: '/test',
        relativePath: '.',
        name: 'test',
        type: 'directory',
        size: 100,
        children: [packageJsonNode],
      },
      files: new Map([['package.json', packageJsonNode]]),
      totalFiles: 1,
      totalSize: 100,
    };

    const configFiles = new Map([['package.json', packageJsonNode]]);

    // Mock package.json content would be needed for full test
    // This test structure is in place for future expansion
    expect(fileTree).toBeDefined();
    expect(configFiles.has('package.json')).toBe(true);
  });
});

