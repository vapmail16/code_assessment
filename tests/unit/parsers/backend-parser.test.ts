/**
 * Unit tests for backend parser
 */

import { parseBackendFile } from '../../../src/analyzers/backend/parser';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

describe('Backend Parser', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-'));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('should parse Express route file', () => {
    const testFile = path.join(tempDir, 'routes.ts');
    const content = `
import express from 'express';
const router = express.Router();

router.get('/users/:id', async (req, res) => {
  const userId = req.params.id;
  res.json({ id: userId });
});

export default router;
`;
    fs.writeFileSync(testFile, content);

    const result = parseBackendFile(testFile);

    expect(result).not.toBeNull();
    expect(result?.language).toBe('typescript');
    expect(result?.imports.some((imp) => imp.from === 'express')).toBe(true);
  });

  test('should parse file with database queries', () => {
    const testFile = path.join(tempDir, 'service.ts');
    const content = `
import { User } from '../models/User';

export async function getUserById(id: string) {
  return await User.findByPk(id);
}

export async function createUser(data: any) {
  return await User.create(data);
}
`;
    fs.writeFileSync(testFile, content);

    const result = parseBackendFile(testFile);

    expect(result).not.toBeNull();
    expect(result?.functions?.length).toBeGreaterThan(0);
  });

  test('should handle invalid file gracefully', () => {
    const result = parseBackendFile('/nonexistent/file.ts');
    expect(result).toBeNull();
  });

  test('should extract classes', () => {
    const testFile = path.join(tempDir, 'class.ts');
    const content = `
export class UserService {
  async getUser(id: string) {
    return { id, name: 'Test' };
  }

  async updateUser(id: string, data: any) {
    return { id, ...data };
  }
}
`;
    fs.writeFileSync(testFile, content);

    const result = parseBackendFile(testFile);

    expect(result).not.toBeNull();
    expect(result?.classes?.length).toBe(1);
    expect(result?.classes?.[0]?.methods?.length).toBe(2);
  });
});

