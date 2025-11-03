/**
 * GitHub API client
 */

import { Octokit } from '@octokit/rest';
import { createAuthenticatedClient } from './auth';
import { RepositoryInfo, BranchInfo, CommitInfo, GitHubConfig } from './types';

export class GitHubAPIClient {
  private octokit: Octokit;
  private config?: GitHubConfig;

  constructor(config?: GitHubConfig) {
    this.config = config;
    this.octokit = createAuthenticatedClient(config);
  }

  /**
   * Parse repository ID (owner/repo) from various formats
   */
  private parseRepoId(repoId: string): { owner: string; repo: string } {
    // Handle various formats:
    // - "owner/repo"
    // - "https://github.com/owner/repo"
    // - "git@github.com:owner/repo.git"
    // - Full GitHub URL

    let owner = '';
    let repo = '';

    // Handle full URLs
    if (repoId.includes('github.com')) {
      const match = repoId.match(/github\.com[/:]([^/]+)\/([^/]+?)(?:\.git)?$/);
      if (match) {
        owner = match[1];
        repo = match[2];
      }
    } else {
      // Handle owner/repo format
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

  /**
   * Get repository information
   */
  async getRepositoryInfo(repoId: string): Promise<RepositoryInfo> {
    const { owner, repo } = this.parseRepoId(repoId);

    try {
      const { data } = await this.octokit.rest.repos.get({
        owner,
        repo,
      });

      // Get repository languages
      const languagesData = await this.octokit.rest.repos.listLanguages({
        owner,
        repo,
      });

      const repositoryInfo: RepositoryInfo = {
        id: `${owner}/${repo}`,
        name: data.name,
        fullName: data.full_name,
        owner: data.owner.login,
        description: data.description || undefined,
        url: data.html_url,
        cloneUrl: data.clone_url,
        defaultBranch: data.default_branch,
        isPrivate: data.private,
        language: data.language || undefined,
        languages: languagesData.data,
        size: data.size, // in KB
        stars: data.stargazers_count,
        forks: data.forks_count,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        pushedAt: data.pushed_at || undefined,
      };

      return repositoryInfo;
    } catch (error: any) {
      if (error.status === 404) {
        throw new Error(`Repository not found: ${repoId}`);
      }
      if (error.status === 403) {
        throw new Error(
          `Access denied to repository: ${repoId}. Check your token permissions.`
        );
      }
      throw new Error(`Failed to fetch repository info: ${error.message}`);
    }
  }

  /**
   * Get repository branches
   */
  async getBranches(repoId: string): Promise<BranchInfo[]> {
    const { owner, repo } = this.parseRepoId(repoId);

    try {
      const { data } = await this.octokit.rest.repos.listBranches({
        owner,
        repo,
        per_page: 100,
      });

      return data.map((branch) => ({
        name: branch.name,
        sha: branch.commit.sha,
        protected: branch.protected,
      }));
    } catch (error: any) {
      throw new Error(`Failed to fetch branches: ${error.message}`);
    }
  }

  /**
   * Get latest commit for a branch
   */
  async getLatestCommit(
    repoId: string,
    branch: string = 'main'
  ): Promise<CommitInfo> {
    const { owner, repo } = this.parseRepoId(repoId);

    try {
      const { data } = await this.octokit.rest.repos.getBranch({
        owner,
        repo,
        branch,
      });

      const commit = data.commit;

      return {
        sha: commit.sha,
        message: commit.commit.message,
        author: {
          name: commit.commit.author?.name || 'Unknown',
          email: commit.commit.author?.email || '',
          date: commit.commit.author?.date || '',
        },
        date: commit.commit.author?.date || '',
      };
    } catch (error: any) {
      if (error.status === 404) {
        throw new Error(`Branch not found: ${branch} in ${repoId}`);
      }
      throw new Error(`Failed to fetch commit: ${error.message}`);
    }
  }

  /**
   * Check rate limit status
   */
  async getRateLimit(): Promise<{
    remaining: number;
    reset: number;
    limit: number;
  }> {
    const { data } = await this.octokit.rest.rateLimit.get();
    return {
      remaining: data.rate.remaining,
      reset: data.rate.reset,
      limit: data.rate.limit,
    };
  }
}
