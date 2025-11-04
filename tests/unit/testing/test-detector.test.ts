/**
 * Unit tests for test detector
 */

import { detectTestFiles, mapTestsToCode } from '../../../src/analyzers/testing/test-detector';
import { FileTree, FileNode } from '../../../src/types';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

describe('Test Detector', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-'));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('should detect Jest test files', () => {
    const testFile = path.join(tempDir, 'Component.test.tsx');
    const content = `
import { render, screen } from '@testing-library/react';
import { UserProfile } from './UserProfile';

describe('UserProfile', () => {
  it('renders user name', () => {
    render(<UserProfile name="John" />);
    expect(screen.getByText('John')).toBeInTheDocument();
  });
});
`;
    fs.writeFileSync(testFile, content);

    const fileNode: FileNode = {
      type: 'file',
      path: testFile,
      relativePath: 'Component.test.tsx',
      name: 'Component.test.tsx',
      size: content.length,
      content,
    };
    const fileTree: FileTree = {
      root: { type: 'directory', path: tempDir, relativePath: '', name: path.basename(tempDir), size: 0 },
      files: new Map([[testFile, fileNode]]),
      totalFiles: 1,
      totalSize: content.length,
    };

    const testFiles = detectTestFiles(fileTree);

    expect(testFiles.length).toBe(1);
    expect(testFiles[0].framework).toBe('jest');
    expect(testFiles[0].type).toBe('unit');
    expect(testFiles[0].testSuites.length).toBeGreaterThan(0);
    expect(testFiles[0].tests.length).toBeGreaterThan(0);
  });

  test('should map tests to code files', () => {
    const sourceFile = path.join(tempDir, 'UserProfile.tsx');
    const testFile = path.join(tempDir, 'UserProfile.test.tsx');
    
    fs.writeFileSync(sourceFile, 'export const UserProfile = () => null;');
    fs.writeFileSync(testFile, 'import { UserProfile } from "./UserProfile";');

    const sourceNode: FileNode = { type: 'file', path: sourceFile, relativePath: 'UserProfile.tsx', name: 'UserProfile.tsx', size: 0, content: '' };
    const testNode: FileNode = { type: 'file', path: testFile, relativePath: 'UserProfile.test.tsx', name: 'UserProfile.test.tsx', size: 0, content: 'import { UserProfile } from "./UserProfile";' };
    const fileTree: FileTree = {
      root: { type: 'directory', path: tempDir, relativePath: '', name: path.basename(tempDir), size: 0 },
      files: new Map([[sourceFile, sourceNode], [testFile, testNode]]),
      totalFiles: 2,
      totalSize: 0,
    };

    const testFiles = detectTestFiles(fileTree);
    const coverageMap = mapTestsToCode(testFiles, fileTree);

    expect(coverageMap.size).toBeGreaterThan(0);
  });
});

