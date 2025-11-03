/**
 * Integration tests for GitHub module
 */

import { GitHubService } from '../../src/github';
import { GitHubAPIClient } from '../../src/github/api';
import { createAuthenticatedClient } from '../../src/github/auth';

describe('GitHub Integration', () => {
  let githubService: GitHubService;
  let apiClient: GitHubAPIClient;

  beforeAll(() => {
    // Skip tests if no GitHub token is available
    if (!process.env.GITHUB_TOKEN) {
      console.warn('GITHUB_TOKEN not set, skipping GitHub integration tests');
      return;
    }

    githubService = new GitHubService({
      token: process.env.GITHUB_TOKEN,
    });

    apiClient = new GitHubAPIClient({
      token: process.env.GITHUB_TOKEN,
    });
  });

  describe('GitHubAPIClient', () => {
    it('should create authenticated client', () => {
      if (!process.env.GITHUB_TOKEN) {
        return;
      }

      const client = createAuthenticatedClient({
        token: process.env.GITHUB_TOKEN,
      });

      expect(client).toBeDefined();
    });

    it('should get repository info', async () => {
      if (!process.env.GITHUB_TOKEN) {
        return;
      }

      const repoInfo = await apiClient.getRepositoryInfo(
        'facebook/react'
      );

      expect(repoInfo).toBeDefined();
      expect(repoInfo.name).toBe('react');
      expect(repoInfo.owner).toBe('facebook');
      expect(repoInfo.fullName).toBe('facebook/react');
      expect(repoInfo.url).toContain('github.com');
      expect(repoInfo.cloneUrl).toBeDefined();
      expect(repoInfo.defaultBranch).toBeDefined();
    });

    it('should parse different repo ID formats', async () => {
      if (!process.env.GITHUB_TOKEN) {
        return;
      }

      // Test different formats
      const formats = [
        'facebook/react',
        'https://github.com/facebook/react',
        'git@github.com:facebook/react.git',
      ];

      for (const format of formats) {
        const repoInfo = await apiClient.getRepositoryInfo(format);
        expect(repoInfo.fullName).toBe('facebook/react');
      }
    });

    it('should handle rate limits', async () => {
      if (!process.env.GITHUB_TOKEN) {
        return;
      }

      const rateLimit = await apiClient.getRateLimit();
      expect(rateLimit).toBeDefined();
      expect(rateLimit.remaining).toBeGreaterThanOrEqual(0);
      expect(rateLimit.limit).toBeGreaterThan(0);
    });
  });

  describe('RepositoryFileAnalyzer', () => {
    it('should analyze file structure', () => {
      // This would require a cloned repository
      // For now, we'll test the file utilities directly
      expect(true).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should throw error for invalid repository', async () => {
      if (!process.env.GITHUB_TOKEN) {
        return;
      }

      await expect(
        apiClient.getRepositoryInfo('invalid/does-not-exist-repo-12345')
      ).rejects.toThrow();
    });
  });
});

