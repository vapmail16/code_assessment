/**
 * GitHub authentication utilities
 */

import { Octokit } from '@octokit/rest';
import { GitHubConfig } from './types';

/**
 * Create an authenticated Octokit instance
 */
export function createAuthenticatedClient(config?: GitHubConfig): Octokit {
  const token = config?.token || process.env.GITHUB_TOKEN;

  if (!token) {
    throw new Error(
      'GitHub token is required. Set GITHUB_TOKEN environment variable or provide token in config.'
    );
  }

  return new Octokit({
    auth: token,
    baseUrl: config?.baseUrl || 'https://api.github.com',
    request: {
      timeout: config?.timeout || 30000, // 30 seconds default
    },
  });
}

/**
 * Validate GitHub token
 */
export async function validateToken(token: string): Promise<boolean> {
  try {
    const octokit = new Octokit({ auth: token });
    await octokit.rest.users.getAuthenticated();
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get token from environment or config
 */
export function getToken(config?: GitHubConfig): string {
  return config?.token || process.env.GITHUB_TOKEN || '';
}
