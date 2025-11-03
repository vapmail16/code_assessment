/**
 * File system utilities
 */

import * as fs from 'fs';
import * as path from 'path';
import { FileNode } from '../types';
import type { FileTree } from '../types';

// Common file extensions mapped to languages
const LANGUAGE_MAP: Record<string, string> = {
  // JavaScript/TypeScript
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.mjs': 'javascript',
  '.cjs': 'javascript',

  // Python
  '.py': 'python',
  '.pyw': 'python',
  '.pyi': 'python',

  // Java
  '.java': 'java',
  '.class': 'java',

  // C/C++
  '.c': 'c',
  '.cpp': 'cpp',
  '.cc': 'cpp',
  '.cxx': 'cpp',
  '.h': 'c',
  '.hpp': 'cpp',

  // Go
  '.go': 'go',

  // Rust
  '.rs': 'rust',

  // Ruby
  '.rb': 'ruby',

  // PHP
  '.php': 'php',

  // HTML/CSS
  '.html': 'html',
  '.htm': 'html',
  '.css': 'css',
  '.scss': 'scss',
  '.sass': 'sass',
  '.less': 'less',

  // Vue
  '.vue': 'vue',

  // Markdown
  '.md': 'markdown',
  '.markdown': 'markdown',

  // JSON
  '.json': 'json',

  // YAML
  '.yml': 'yaml',
  '.yaml': 'yaml',

  // SQL
  '.sql': 'sql',

  // Shell
  '.sh': 'shell',
  '.bash': 'shell',
  '.zsh': 'shell',

  // Config files
  '.xml': 'xml',
  '.toml': 'toml',
  '.ini': 'ini',
  '.conf': 'config',
};

// Files/directories to ignore
const IGNORE_PATTERNS = [
  'node_modules',
  '.git',
  '.svn',
  '.hg',
  'dist',
  'build',
  '.next',
  '.nuxt',
  '.vuepress',
  'coverage',
  '.nyc_output',
  '.cache',
  '.parcel-cache',
  '.turbo',
  '.idea',
  '.vscode',
  '.DS_Store',
  'Thumbs.db',
  '*.log',
  '*.swp',
  '*.swo',
  '*~',
  '.env',
  '.env.local',
  '.env.*.local',
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
];

/**
 * Check if a file/directory should be ignored
 */
export function shouldIgnore(filePath: string, fileName: string): boolean {
  // Check against ignore patterns
  for (const pattern of IGNORE_PATTERNS) {
    if (pattern.includes('*')) {
      // Handle wildcard patterns
      const regex = new RegExp(
        pattern.replace(/\*/g, '.*').replace(/\./g, '\\.')
      );
      if (regex.test(fileName) || regex.test(filePath)) {
        return true;
      }
    } else {
      if (
        fileName === pattern ||
        filePath.includes(`/${pattern}/`) ||
        filePath.includes(`\\${pattern}\\`)
      ) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Get language from file extension
 */
export function getLanguageFromExtension(filePath: string): string | undefined {
  const ext = path.extname(filePath).toLowerCase();
  return LANGUAGE_MAP[ext];
}

/**
 * Read file content (with size limit)
 */
export function readFileContent(
  filePath: string,
  maxSize: number = 1024 * 1024
): string | undefined {
  try {
    const stats = fs.statSync(filePath);
    if (stats.size > maxSize) {
      return undefined; // File too large, skip content
    }
    return fs.readFileSync(filePath, 'utf-8');
  } catch (error) {
    return undefined;
  }
}

/**
 * Build file tree from directory
 */
export function buildFileTree(
  dirPath: string,
  basePath: string = dirPath,
  maxDepth: number = 20,
  currentDepth: number = 0
): FileTree {
  const files = new Map<string, FileNode>();
  let totalSize = 0;
  let totalFiles = 0;

  function traverseDirectory(currentPath: string, depth: number): FileNode | null {
    if (depth > maxDepth) {
      return null;
    }

    const relativePath = path.relative(basePath, currentPath);
    const fileName = path.basename(currentPath);
    const stats = fs.statSync(currentPath);

    // Check if should be ignored
    if (shouldIgnore(relativePath, fileName)) {
      return null;
    }

    const fileNode: FileNode = {
      path: currentPath,
      relativePath: relativePath || '.',
      name: fileName,
      type: stats.isDirectory() ? 'directory' : 'file',
      size: stats.size,
      extension: stats.isFile() ? path.extname(fileName) : undefined,
      language: stats.isFile() ? getLanguageFromExtension(currentPath) : undefined,
      encoding: stats.isFile() ? 'utf-8' : undefined,
      children: [],
    };

    if (stats.isDirectory()) {
      try {
        const entries = fs.readdirSync(currentPath);
        for (const entry of entries) {
          const entryPath = path.join(currentPath, entry);
          const childNode = traverseDirectory(entryPath, depth + 1);
          if (childNode) {
            fileNode.children!.push(childNode);
            files.set(childNode.relativePath, childNode);
            totalSize += childNode.size;
            if (childNode.type === 'file') {
              totalFiles++;
            }
          }
        }
      } catch (error) {
        // Skip directories we can't read
      }
    } else {
      // It's a file
      files.set(fileNode.relativePath, fileNode);
      totalSize += fileNode.size;
      totalFiles++;
    }

    return fileNode;
  }

  const root = traverseDirectory(dirPath, currentDepth);

  if (!root) {
    throw new Error('Failed to build file tree');
  }

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
export function findConfigFiles(fileTree: FileTree): Map<string, FileNode> {
  const configFiles = new Map<string, FileNode>();

  const configPatterns = [
    'package.json',
    'package-lock.json',
    'yarn.lock',
    'pnpm-lock.yaml',
    'requirements.txt',
    'Pipfile',
    'poetry.lock',
    'setup.py',
    'pyproject.toml',
    'go.mod',
    'go.sum',
    'Cargo.toml',
    'pom.xml',
    'build.gradle',
    'tsconfig.json',
    'jsconfig.json',
    'webpack.config.js',
    'vite.config.js',
    'next.config.js',
    'nuxt.config.js',
    '.eslintrc',
    '.eslintrc.json',
    '.eslintrc.js',
    'eslint.config.js',
    '.prettierrc',
    'jest.config.js',
    'vitest.config.js',
    'docker-compose.yml',
    'Dockerfile',
    '.dockerignore',
    '.gitignore',
    'README.md',
    'LICENSE',
    '.env.example',
    '.env.template',
  ];

  for (const [relativePath, fileNode] of fileTree.files) {
    const fileName = path.basename(fileNode.path);
    if (configPatterns.includes(fileName)) {
      configFiles.set(relativePath, fileNode);
    }
  }

  return configFiles;
}

/**
 * Find entry point files
 */
export function findEntryPoints(fileTree: FileTree): FileNode[] {
  const entryPoints: FileNode[] = [];

  const entryPatterns = [
    'index.js',
    'index.ts',
    'index.tsx',
    'index.jsx',
    'main.js',
    'main.ts',
    'app.js',
    'app.ts',
    'server.js',
    'server.ts',
    'App.js',
    'App.tsx',
    'main.py',
    'app.py',
    '__main__.py',
    'main.go',
    'main.rs',
    'Main.java',
    'Application.java',
  ];

  for (const [relativePath, fileNode] of fileTree.files) {
    if (fileNode.type === 'file') {
      const fileName = path.basename(fileNode.path);
      if (entryPatterns.includes(fileName)) {
        entryPoints.push(fileNode);
      }
    }
  }

  return entryPoints;
}

