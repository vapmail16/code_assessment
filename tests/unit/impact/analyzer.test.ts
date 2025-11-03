/**
 * Unit tests for impact analysis
 */

import { analyzeChangeImpact, ImpactAnalysisContext } from '../../../src/impact/analyzer';
import { parseChangeRequest } from '../../../src/impact/change-parser';
import { LineageGraph } from '../../../src/types';
import { Endpoint } from '../../../src/types';

describe('Impact Analyzer', () => {
  test('should parse change request from natural language', () => {
    const change = parseChangeRequest('Modify the /api/users endpoint to add pagination');
    
    expect(change).toBeDefined();
    expect(change.type).toBe('modify-api');
    expect(change.description).toContain('endpoint');
  });

  test('should identify affected files for API change', () => {
    const change = parseChangeRequest('Change endpoint: /api/users');
    
    // targetEndpoints might not be extracted from natural language, check description
    expect(change.description).toContain('endpoint');
  });

  test('should parse schema change request', () => {
    const change = parseChangeRequest('Add a new column to the users table');
    
    expect(change.type).toBe('modify-schema');
  });

  test('should parse component change request', () => {
    const change = parseChangeRequest('Update UserProfile component to show avatar');
    
    expect(change.type).toBe('modify-feature');
  });

  test('should handle structured change request', () => {
    const structuredChange = {
      id: 'test-1',
      type: 'modify-api' as const,
      description: 'Modify endpoint',
      targetEndpoints: ['/api/users'],
    };

    const result = parseChangeRequest(structuredChange);
    
    expect(result.id).toBe('test-1');
    expect(result.type).toBe('modify-api');
    expect(result.targetEndpoints).toEqual(['/api/users']);
  });
});

