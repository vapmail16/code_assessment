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

    const fileTree: FileTree = {
      files: new Map([
        [
          testFile,
          {
            type: 'file',
            path: testFile,
            name: 'Component.test.tsx',
            content,
          } as FileNode,
        ],
      ]),
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

    const fileTree: FileTree = {
      files: new Map([
        [sourceFile, { type: 'file', path: sourceFile, name: 'UserProfile.tsx', content: '' } as FileNode],
        [testFile, { type: 'file', path: testFile, name: 'UserProfile.test.tsx', content: 'import { UserProfile } from "./UserProfile";' } as FileNode],
      ]),
    };

    const testFiles = detectTestFiles(fileTree);
    const coverageMap = mapTestsToCode(testFiles, fileTree);

    expect(coverageMap.size).toBeGreaterThan(0);
  });
});

