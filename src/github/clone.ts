/**
 * Repository cloning functionality
 */

import simpleGit, { SimpleGit, SimpleGitOptions } from 'simple-git';
import * as fs from 'fs';
import * as path from 'path';
import { CloneOptions } from './types';
import { RepositoryInfo } from './types';

export class RepositoryCloner {
  private baseDir: string;

  constructor(baseDir: string = '.repos') {
    this.baseDir = baseDir;
    // Ensure base directory exists
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  /**
   * Clone a repository
   */
  async cloneRepository(
    repositoryInfo: RepositoryInfo,
    options: CloneOptions = {}
  ): Promise<string> {
    const { branch, depth, destination } = options;

    // Determine destination path
    const repoPath = destination || this.getLocalPath(repositoryInfo.fullName);

    // If repository already exists, check if we should update it
    if (fs.existsSync(repoPath)) {
      console.log(`Repository already exists at ${repoPath}`);
      // For now, we'll return the existing path
      // In future, we might want to fetch/pull updates
      return repoPath;
    }

    // Prepare git options
    const gitOptions: Partial<SimpleGitOptions> = {
      baseDir: this.baseDir,
      maxConcurrentProcesses: 1,
    };

    const git: SimpleGit = simpleGit(gitOptions);

    // Build clone URL with token if available
    let cloneUrl = repositoryInfo.cloneUrl;
    const token = process.env.GITHUB_TOKEN;
    if (token && repositoryInfo.isPrivate) {
      // For private repos, embed token in URL
      cloneUrl = repositoryInfo.cloneUrl.replace(
        'https://',
        `https://${token}@`
      );
    }

    try {
      // Configure clone options
      const cloneOptions: string[] = [];
      if (depth) {
        cloneOptions.push(`--depth=${depth}`);
      }
      if (branch) {
        cloneOptions.push(`--branch=${branch}`);
        cloneOptions.push('--single-branch');
      }

      // Clone repository
      await git.clone(cloneUrl, repoPath, cloneOptions);

      console.log(`Repository cloned successfully to ${repoPath}`);
      return repoPath;
    } catch (error: any) {
      if (error.message?.includes('already exists')) {
        return repoPath;
      }
      throw new Error(`Failed to clone repository: ${error.message}`);
    }
  }

  /**
   * Get local path for a repository
   */
  getLocalPath(repoFullName: string): string {
    // Sanitize repository name for filesystem
    const sanitizedName = repoFullName.replace(/[^a-zA-Z0-9._-]/g, '_');
    return path.join(this.baseDir, sanitizedName);
  }

  /**
   * Check if repository is already cloned
   */
  isCloned(repoFullName: string): boolean {
    const repoPath = this.getLocalPath(repoFullName);
    return fs.existsSync(path.join(repoPath, '.git'));
  }

  /**
   * Remove cloned repository
   */
  async removeRepository(repoFullName: string): Promise<void> {
    const repoPath = this.getLocalPath(repoFullName);
    if (fs.existsSync(repoPath)) {
      fs.rmSync(repoPath, { recursive: true, force: true });
    }
  }

  /**
   * Get repository path if it exists
   */
  getRepositoryPath(repoFullName: string): string | null {
    const repoPath = this.getLocalPath(repoFullName);
    if (fs.existsSync(repoPath) && fs.existsSync(path.join(repoPath, '.git'))) {
      return repoPath;
    }
    return null;
  }
}
