# GitHub Integration Module

This module provides functionality to interact with GitHub repositories, including:
- Fetching repository metadata via GitHub API
- Cloning repositories locally
- Analyzing file system structure

## Usage

### Basic Example

```typescript
import {
  fetchRepositoryMetadata,
  cloneRepository,
  analyzeFileSystem,
} from './github';

// Fetch repository info
const repoInfo = await fetchRepositoryMetadata('owner/repo');

// Clone repository
const cloneResult = await cloneRepository('owner/repo', {
  branch: 'main',
  depth: 1, // shallow clone
});

// Analyze file system
const fileTree = analyzeFileSystem(cloneResult.localPath);
```

### Authentication

Set the `GITHUB_TOKEN` environment variable or pass it in config:

```typescript
import { fetchRepositoryMetadata } from './github';

const repoInfo = await fetchRepositoryMetadata('owner/repo', {
  token: 'your-github-token',
});
```

### Error Handling

The module throws descriptive errors for common issues:
- Repository not found (404)
- Access denied (403)
- Invalid repository identifier
- Clone failures

