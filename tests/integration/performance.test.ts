/**
 * Performance benchmark tests
 */

import { runBenchmark, runBenchmarkSuite } from '../../src/performance/benchmarks';

describe('Performance Benchmarks', () => {
  const token = process.env.GITHUB_TOKEN;

  test.skip('should benchmark small repository', async () => {
    if (!token) {
      console.log('Skipping: GITHUB_TOKEN not provided');
      return;
    }

    // Use a very small test repository
    const result = await runBenchmark('octocat/Hello-World', token);

    expect(result).toBeDefined();
    expect(result.repository).toBe('octocat/Hello-World');
    expect(result.timings.total).toBeGreaterThan(0);
    expect(result.size.files).toBeGreaterThan(0);
  }, 60000);

  test.skip('should run benchmark suite', async () => {
    if (!token) {
      console.log('Skipping: GITHUB_TOKEN not provided');
      return;
    }

    const suite = await runBenchmarkSuite(['octocat/Hello-World'], token);

    expect(suite.results.length).toBe(1);
    expect(suite.summary.averageTime).toBeGreaterThan(0);
    expect(suite.summary.successRate).toBeGreaterThanOrEqual(0);
  }, 120000);
});

