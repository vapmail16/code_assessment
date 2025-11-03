/**
 * Unit tests for frontend parser
 */

import { parseFrontendFile } from '../../../src/analyzers/frontend/parser';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

describe('Frontend Parser', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-'));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('should parse React component file', () => {
    const testFile = path.join(tempDir, 'Component.tsx');
    const content = `
import React from 'react';

interface Props {
  name: string;
  age: number;
}

export const Component: React.FC<Props> = ({ name, age }) => {
  return (
    <div>
      <h1>{name}</h1>
      <p>Age: {age}</p>
    </div>
  );
};
`;
    fs.writeFileSync(testFile, content);

    const result = parseFrontendFile(testFile);

    expect(result).not.toBeNull();
    expect(result?.language).toBe('typescript');
    expect(result?.imports.length).toBeGreaterThan(0);
    expect(result?.exports.length).toBeGreaterThan(0);
    expect(result?.imports.some((imp) => imp.from === 'react')).toBe(true);
  });

  test('should parse JavaScript file with API calls', () => {
    const testFile = path.join(tempDir, 'api.js');
    const content = `
async function fetchUserData(userId) {
  const response = await fetch(\`/api/users/\${userId}\`);
  return response.json();
}
`;
    fs.writeFileSync(testFile, content);

    const result = parseFrontendFile(testFile);

    expect(result).not.toBeNull();
    expect(result?.language).toBe('javascript');
    expect(result?.functions.length).toBeGreaterThan(0);
  });

  test('should handle invalid file gracefully', () => {
    const result = parseFrontendFile('/nonexistent/file.tsx');
    expect(result).toBeNull();
  });

  test('should calculate complexity', () => {
    const testFile = path.join(tempDir, 'complex.tsx');
    const content = `
function complexFunction(x) {
  if (x > 0) {
    if (x > 10) {
      if (x > 20) {
        return x * 2;
      }
      return x;
    }
    return x + 1;
  }
  return 0;
}
`;
    fs.writeFileSync(testFile, content);

    const result = parseFrontendFile(testFile);

    expect(result).not.toBeNull();
    expect(result?.complexity).toBeGreaterThan(1);
  });
});

