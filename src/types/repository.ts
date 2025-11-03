/**
 * Core repository types
 */

export interface Repository {
  id: string;
  url: string;
  name: string;
  owner: string;
  description?: string;
  branch: string;
  defaultBranch: string;
  cloneUrl: string;
  localPath?: string; // Path where repo is cloned locally
  createdAt: Date;
  updatedAt: Date;
  metadata: RepositoryMetadata;
}

export interface RepositoryMetadata {
  size: number; // in bytes
  languages: LanguageStats[];
  fileCount: number;
  lastCommit?: {
    sha: string;
    message: string;
    author: string;
    date: Date;
  };
}

export interface LanguageStats {
  language: string;
  bytes: number;
  percentage: number;
}

export interface FileNode {
  path: string;
  relativePath: string;
  name: string;
  type: 'file' | 'directory';
  size: number;
  language?: string;
  content?: string; // Content if file is small enough
  children?: FileNode[]; // If directory
  extension?: string;
  encoding?: string;
}

export interface FileTree {
  root: FileNode;
  files: Map<string, FileNode>; // path -> FileNode
  totalFiles: number;
  totalSize: number;
}

