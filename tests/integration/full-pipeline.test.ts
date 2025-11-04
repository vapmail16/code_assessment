/**
 * Integration tests for full analysis pipeline
 */

import { GitHubService } from '../../src/github/service';
import { TechStackDetector } from '../../src/detection/engine';

describe('Full Pipeline Integration', () => {
  // Skip actual GitHub API calls in CI unless token is provided
  const token = process.env.GITHUB_TOKEN;

  test.skip('should analyze a small test repository end-to-end', async () => {
    if (!token) {
      console.log('Skipping test: GITHUB_TOKEN not provided');
      return;
    }

    const githubService = new GitHubService({ token });
    
    // Use a small public test repository
    const repoId = 'octocat/Hello-World'; // Small GitHub test repo
    
    try {
      // Get repository info
      const repoInfo = await githubService.getRepositoryInfo(repoId);
      expect(repoInfo).toBeDefined();
      
      // Clone and analyze
      const analysis = await githubService.cloneAndAnalyzeRepository(repoId);
      expect(analysis.fileTree).toBeDefined();
      expect(analysis.fileTree.files.size).toBeGreaterThan(0);
      
      // Detect tech stack
      const detector = new TechStackDetector();
      const techStack = detector.detectTechStack({
        fileTree: analysis.fileTree,
        configFiles: analysis.configFiles,
        entryPoints: analysis.entryPoints,
      });
      
      expect(techStack).toBeDefined();
      
      // Cleanup
      await githubService.removeClonedRepository(repoId);
    } catch (error) {
      // Cleanup on error
      try {
        await githubService.removeClonedRepository(repoId);
      } catch {
        // Ignore cleanup errors
      }
      throw error;
    }
  }, 30000); // 30 second timeout

  test('should handle invalid repository gracefully', async () => {
    const githubService = new GitHubService();
    
    await expect(
      githubService.getRepositoryInfo('invalid/invalid-repo-that-does-not-exist-12345')
    ).rejects.toThrow();
  });
});

