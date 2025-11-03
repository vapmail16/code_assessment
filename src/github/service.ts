/**
 * Main GitHub service - combines API, cloning, and file analysis
 */

import { GitHubAPIClient } from './api';
import { RepositoryCloner } from './clone';
import { RepositoryFileAnalyzer } from './file-analyzer';
import {
  RepositoryInfo,
  GitHubConfig,
  CloneOptions,
  CommitInfo,
  BranchInfo,
} from './types';
import { FileNode } from '../types';
import type { FileTree } from '../types';

export interface RepositoryAnalysis {
  repository: RepositoryInfo;
  localPath: string;
  fileTree: FileTree;
  configFiles: Map<string, FileNode>;
  entryPoints: FileNode[];
  stats: {
    totalFiles: number;
    totalSize: number;
    languages: Record<string, number>;
    largestFiles: Array<{ path: string; size: number }>;
  };
  latestCommit?: CommitInfo;
  branch?: string;
}

export class GitHubService {
  private apiClient: GitHubAPIClient;
  private cloner: RepositoryCloner;
  private fileAnalyzer: RepositoryFileAnalyzer;

  constructor(config?: GitHubConfig) {
    this.apiClient = new GitHubAPIClient(config);
    this.cloner = new RepositoryCloner();
    this.fileAnalyzer = new RepositoryFileAnalyzer();
  }

  /**
   * Get repository information from GitHub
   */
  async getRepositoryInfo(repoId: string): Promise<RepositoryInfo> {
    return this.apiClient.getRepositoryInfo(repoId);
  }

  /**
   * Clone and analyze a repository
   */
  async cloneAndAnalyzeRepository(
    repoId: string,
    options: CloneOptions = {}
  ): Promise<RepositoryAnalysis> {
    // Get repository info
    const repositoryInfo = await this.apiClient.getRepositoryInfo(repoId);

    // Clone repository
    const localPath = await this.cloner.cloneRepository(repositoryInfo, {
      branch: options.branch || repositoryInfo.defaultBranch,
      depth: options.depth,
      destination: options.destination,
    });

    // Get latest commit info
    let latestCommit: CommitInfo | undefined;
    try {
      latestCommit = await this.apiClient.getLatestCommit(
        repoId,
        options.branch || repositoryInfo.defaultBranch
      );
    } catch (error) {
      // If commit fetch fails, continue without it
      console.warn('Failed to fetch latest commit:', error);
    }

    // Analyze file structure
    const analysis = this.fileAnalyzer.analyzeRepository(localPath);

    return {
      repository: repositoryInfo,
      localPath,
      fileTree: analysis.fileTree,
      configFiles: analysis.configFiles,
      entryPoints: analysis.entryPoints,
      stats: analysis.stats,
      latestCommit,
      branch: options.branch || repositoryInfo.defaultBranch,
    };
  }

  /**
   * Get repository branches
   */
  async getBranches(repoId: string): Promise<BranchInfo[]> {
    return this.apiClient.getBranches(repoId);
  }

  /**
   * Get latest commit for a branch
   */
  async getLatestCommit(repoId: string, branch?: string): Promise<CommitInfo> {
    return this.apiClient.getLatestCommit(repoId, branch);
  }

  /**
   * Check if repository is already cloned
   */
  isCloned(repoId: string): boolean {
    const { owner, repo } = this.parseRepoId(repoId);
    return this.cloner.isCloned(`${owner}/${repo}`);
  }

  /**
   * Get cloned repository path if it exists
   */
  getClonedPath(repoId: string): string | null {
    const { owner, repo } = this.parseRepoId(repoId);
    return this.cloner.getRepositoryPath(`${owner}/${repo}`);
  }

  /**
   * Remove cloned repository
   */
  async removeClonedRepository(repoId: string): Promise<void> {
    const { owner, repo } = this.parseRepoId(repoId);
    await this.cloner.removeRepository(`${owner}/${repo}`);
  }

  /**
   * Get rate limit status
   */
  async getRateLimit() {
    return this.apiClient.getRateLimit();
  }

  /**
   * Parse repository ID
   */
  private parseRepoId(repoId: string): { owner: string; repo: string } {
    // Handle various formats
    let owner = '';
    let repo = '';

    if (repoId.includes('github.com')) {
      const match = repoId.match(/github\.com[/:]([^/]+)\/([^/]+?)(?:\.git)?$/);
      if (match) {
        owner = match[1];
        repo = match[2];
      }
    } else {
      const parts = repoId.split('/');
      if (parts.length >= 2) {
        owner = parts[0];
        repo = parts[1].replace(/\.git$/, '');
      }
    }

    if (!owner || !repo) {
      throw new Error(`Invalid repository ID format: ${repoId}`);
    }

    return { owner, repo };
  }
}

