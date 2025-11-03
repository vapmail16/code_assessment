/**
 * File system analysis for cloned repositories
 */

import * as path from 'path';
import * as fs from 'fs';
import { FileNode, FileTree } from '../types/repository';

/**
 * Files and directories to ignore
 */
const IGNORE_PATTERNS = [
  '.git',
  'node_modules',
  '.next',
  '.nuxt',
  'dist',
  'build',
  '.build',
  'out',
  '.out',
  'coverage',
  '.nyc_output',
  '.cache',
  '.parcel-cache',
  '.vscode',
  '.idea',
  '__pycache__',
  '.pytest_cache',
  '.mypy_cache',
  '*.pyc',
  '.env',
  '.env.local',
  '.DS_Store',
  'Thumbs.db',
];

/**
 * Check if file/directory should be ignored
 */
function shouldIgnore(filePath: string, fileName: string): boolean {
  const normalizedPath = filePath.replace(/\\/g, '/');

  // Check ignore patterns
  for (const pattern of IGNORE_PATTERNS) {
    if (
      fileName === pattern ||
      normalizedPath.includes(`/${pattern}/`) ||
      normalizedPath.includes(`/${pattern}`) ||
      normalizedPath.endsWith(`/${pattern}`)
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Detect language from file extension
 */
function detectLanguage(fileName: string): string | undefined {
  const ext = path.extname(fileName).toLowerCase();
  const languageMap: Record<string, string> = {
    '.ts': 'typescript',
    '.tsx': 'typescript',
    '.js': 'javascript',
    '.jsx': 'javascript',
    '.py': 'python',
    '.java': 'java',
    '.go': 'go',
    '.rs': 'rust',
    '.cpp': 'cpp',
    '.c': 'c',
    '.cs': 'csharp',
    '.php': 'php',
    '.rb': 'ruby',
    '.swift': 'swift',
    '.kt': 'kotlin',
    '.scala': 'scala',
    '.vue': 'vue',
    '.html': 'html',
    '.css': 'css',
    '.scss': 'scss',
    '.json': 'json',
    '.yaml': 'yaml',
    '.yml': 'yaml',
    '.xml': 'xml',
    '.md': 'markdown',
    '.sql': 'sql',
    '.sh': 'shell',
    '.bash': 'shell',
  };

  return languageMap[ext];
}

/**
 * Read file content (with size limit)
 */
function readFileContent(filePath: string, maxSize: number = 1024 * 1024): string | undefined {
  try {
    const stats = fs.statSync(filePath);
    if (stats.size > maxSize) {
      return undefined; // File too large
    }
    return fs.readFileSync(filePath, 'utf-8');
  } catch (error) {
    return undefined;
  }
}

/**
 * Build file tree recursively
 */
function buildFileTree(
  dirPath: string,
  relativePath: string = '',
  files: Map<string, FileNode> = new Map()
): FileNode {
  const fullPath = path.resolve(dirPath, relativePath);
  const stats = fs.statSync(fullPath);
  const fileName = path.basename(fullPath);

  if (shouldIgnore(relativePath, fileName)) {
    throw new Error('Should be ignored');
  }

  if (stats.isDirectory()) {
    const children: FileNode[] = [];
    const entries = fs.readdirSync(fullPath);

    for (const entry of entries) {
      const entryPath = path.join(relativePath || '', entry);
      if (shouldIgnore(entryPath, entry)) {
        continue;
      }

      try {
        const child = buildFileTree(dirPath, entryPath, files);
        children.push(child);
      } catch (error) {
        // Skip ignored files
        continue;
      }
    }

    const dirNode: FileNode = {
      path: fullPath,
      relativePath: relativePath || '.',
      name: fileName || '/',
      type: 'directory',
      size: 0,
      children,
    };

    files.set(relativePath || '.', dirNode);
    return dirNode;
  } else {
    const language = detectLanguage(fileName);
    const content = readFileContent(fullPath);
    const ext = path.extname(fileName);

    const fileNode: FileNode = {
      path: fullPath,
      relativePath,
      name: fileName,
      type: 'file',
      size: stats.size,
      language,
      content,
      extension: ext || undefined,
      encoding: 'utf-8',
    };

    files.set(relativePath, fileNode);
    return fileNode;
  }
}

/**
 * Analyze repository file system
 */
export function analyzeFileSystem(repoPath: string): FileTree {
  if (!fs.existsSync(repoPath)) {
    throw new Error(`Repository path does not exist: ${repoPath}`);
  }

  const files = new Map<string, FileNode>();
  const root = buildFileTree(repoPath, '', files);

  // Calculate total size
  let totalSize = 0;
  let totalFiles = 0;

  function calculateSize(node: FileNode): number {
    if (node.type === 'file') {
      totalFiles++;
      return node.size;
    } else if (node.children) {
      return node.children.reduce((sum, child) => sum + calculateSize(child), 0);
    }
    return 0;
  }

  totalSize = calculateSize(root);

  return {
    root,
    files,
    totalFiles,
    totalSize,
  };
}

/**
 * Find configuration files in repository
 */
export function findConfigFiles(repoPath: string): Map<string, string> {
  const configFiles = new Map<string, string>();
  const patterns: Array<{ name: string; pattern: RegExp }> = [
    { name: 'package.json', pattern: /^package\.json$/ },
    { name: 'requirements.txt', pattern: /^requirements\.txt$/ },
    { name: 'Pipfile', pattern: /^Pipfile$/ },
    { name: 'pyproject.toml', pattern: /^pyproject\.toml$/ },
    { name: 'tsconfig.json', pattern: /^tsconfig\.json$/ },
    { name: 'webpack.config.js', pattern: /^webpack\.config\.js$/ },
    { name: 'vite.config.js', pattern: /^vite\.config\.(js|ts)$/ },
    { name: 'Dockerfile', pattern: /^Dockerfile$/ },
    { name: '.dockerignore', pattern: /^\.dockerignore$/ },
    { name: '.gitignore', pattern: /^\.gitignore$/ },
    { name: '.env.example', pattern: /^\.env\.example$/ },
    { name: 'README.md', pattern: /^README\.md$/ },
  ];

  function searchDirectory(dirPath: string, relativePath: string = ''): void {
    try {
      const entries = fs.readdirSync(dirPath);

      for (const entry of entries) {
        if (shouldIgnore(entry, entry)) {
          continue;
        }

        const fullPath = path.join(dirPath, entry);
        const entryRelativePath = path.join(relativePath, entry);

        const stats = fs.statSync(fullPath);

        if (stats.isDirectory()) {
          searchDirectory(fullPath, entryRelativePath);
        } else {
          for (const { name, pattern } of patterns) {
            if (pattern.test(entry) && !configFiles.has(name)) {
              configFiles.set(name, entryRelativePath);
            }
          }
        }
      }
    } catch (error) {
      // Skip directories we can't read
    }
  }

  searchDirectory(repoPath);
  return configFiles;
}

/**
 * Find entry point files
 */
export function findEntryPoints(repoPath: string): string[] {
  const entryPoints: string[] = [];
  const patterns = [
    /^index\.(js|ts|jsx|tsx)$/,
    /^main\.(js|ts|jsx|tsx|py)$/,
    /^app\.(js|ts|jsx|tsx|py)$/,
    /^server\.(js|ts|jsx|tsx)$/,
    /^src\/index\.(js|ts|jsx|tsx)$/,
    /^src\/main\.(js|ts|jsx|tsx)$/,
  ];

  function searchDirectory(dirPath: string, relativePath: string = ''): void {
    try {
      const entries = fs.readdirSync(dirPath);

      for (const entry of entries) {
        if (shouldIgnore(entry, entry)) {
          continue;
        }

        const fullPath = path.join(dirPath, entry);
        const entryRelativePath = path.join(relativePath, entry);

        const stats = fs.statSync(fullPath);

        if (stats.isDirectory()) {
          searchDirectory(fullPath, entryRelativePath);
        } else {
          for (const pattern of patterns) {
            if (pattern.test(entryRelativePath)) {
              entryPoints.push(entryRelativePath);
            }
          }
        }
      }
    } catch (error) {
      // Skip directories we can't read
    }
  }

  searchDirectory(repoPath);
  return entryPoints;
}

