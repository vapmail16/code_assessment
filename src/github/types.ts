/**
 * GitHub integration types
 */

export interface GitHubConfig {
  token?: string;
  baseUrl?: string;
  timeout?: number;
}

export interface CloneOptions {
  branch?: string;
  depth?: number; // Shallow clone depth
  destination?: string; // Custom destination path
}

export interface RepositoryInfo {
  id: string;
  name: string;
  fullName: string; // owner/repo
  owner: string;
  description?: string;
  url: string;
  cloneUrl: string;
  defaultBranch: string;
  isPrivate: boolean;
  language?: string;
  languages: Record<string, number>; // Language -> bytes
  size: number; // Repository size in KB
  stars: number;
  forks: number;
  createdAt: string;
  updatedAt: string;
  pushedAt?: string;
}

export interface BranchInfo {
  name: string;
  sha: string;
  protected?: boolean;
}

export interface CommitInfo {
  sha: string;
  message: string;
  author: {
    name: string;
    email: string;
    date: string;
  };
  date: string;
}
