/**
 * Repository file system analysis
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  buildFileTree,
  findConfigFiles,
  findEntryPoints,
} from '../utils/file-utils';
import type { FileTree } from '../types';
import { FileNode } from '../types';

export class RepositoryFileAnalyzer {
  /**
   * Analyze repository file structure
   */
  analyzeRepository(repoPath: string): {
    fileTree: FileTree;
    configFiles: Map<string, FileNode>;
    entryPoints: FileNode[];
    stats: {
      totalFiles: number;
      totalSize: number;
      languages: Record<string, number>; // language -> file count
      largestFiles: Array<{ path: string; size: number }>;
    };
  } {
    // Verify repository path exists
    if (!fs.existsSync(repoPath)) {
      throw new Error(`Repository path does not exist: ${repoPath}`);
    }

    // Build file tree
    const fileTree = buildFileTree(repoPath);

    // Find configuration files
    const configFiles = findConfigFiles(fileTree);

    // Find entry points
    const entryPoints = findEntryPoints(fileTree);

    // Calculate statistics
    const languages: Record<string, number> = {};
    const fileSizes: Array<{ path: string; size: number }> = [];

    for (const [relativePath, fileNode] of fileTree.files) {
      if (fileNode.type === 'file' && fileNode.language) {
        languages[fileNode.language] = (languages[fileNode.language] || 0) + 1;
        fileSizes.push({
          path: fileNode.relativePath,
          size: fileNode.size,
        });
      }
    }

    // Sort by size (largest first)
    fileSizes.sort((a, b) => b.size - a.size);
    const largestFiles = fileSizes.slice(0, 10); // Top 10 largest files

    return {
      fileTree,
      configFiles,
      entryPoints,
      stats: {
        totalFiles: fileTree.totalFiles,
        totalSize: fileTree.totalSize,
        languages,
        largestFiles,
      },
    };
  }

  /**
   * Read specific file content
   */
  readFile(repoPath: string, relativePath: string): string | null {
    const fullPath = path.join(repoPath, relativePath);
    try {
      if (fs.existsSync(fullPath)) {
        return fs.readFileSync(fullPath, 'utf-8');
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if file exists in repository
   */
  fileExists(repoPath: string, relativePath: string): boolean {
    const fullPath = path.join(repoPath, relativePath);
    return fs.existsSync(fullPath);
  }
}

