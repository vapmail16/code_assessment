/**
 * GraphQL resolver and schema detection
 */

import { ParsedFile } from '../../types';
import * as fs from 'fs';
import * as path from 'path';

export interface GraphQLResolver {
  id: string;
  type: 'Query' | 'Mutation' | 'Subscription';
  name: string;
  file: string;
  line: number;
  returnType?: string;
  parameters?: Array<{ name: string; type: string }>;
}

export interface GraphQLSchema {
  queries: GraphQLResolver[];
  mutations: GraphQLResolver[];
  subscriptions: GraphQLResolver[];
  types: Array<{
    name: string;
    fields: Array<{ name: string; type: string }>;
  }>;
}

/**
 * Detect GraphQL resolvers in parsed files
 */
export function detectGraphQLResolvers(parsedFile: ParsedFile): GraphQLResolver[] {
  const resolvers: GraphQLResolver[] = [];

  if (!parsedFile.content) {
    return resolvers;
  }

  const content = parsedFile.content;
  const lines = content.split('\n');

  // Detect Apollo Server resolvers (JavaScript/TypeScript)
  // Pattern: Query: { resolverName: (parent, args) => ... }
  const apolloPattern = /(Query|Mutation|Subscription)\s*:\s*\{[^}]*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g;
  let match;
  while ((match = apolloPattern.exec(content)) !== null) {
    const type = match[1] as 'Query' | 'Mutation' | 'Subscription';
    const name = match[2];
    const line = content.substring(0, match.index).split('\n').length;

    resolvers.push({
      id: `graphql-resolver:${parsedFile.path}:${type}:${name}`,
      type,
      name,
      file: parsedFile.path,
      line,
    });
  }

  // Detect GraphQL.js resolvers
  // Pattern: resolverName: (parent, args) => { ... }
  const resolverPattern = /\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:\s*(?:async\s+)?\([^)]*\)\s*=>/g;
  let resolverMatch;
  while ((resolverMatch = resolverPattern.exec(content)) !== null) {
    const name = resolverMatch[1];
    
    // Check if it's in a resolver context
    const context = content.substring(Math.max(0, resolverMatch.index - 100), resolverMatch.index);
    if (context.includes('Query') || context.includes('Mutation') || context.includes('resolvers')) {
      const type = context.includes('Mutation') ? 'Mutation' : context.includes('Subscription') ? 'Subscription' : 'Query';
      const line = content.substring(0, resolverMatch.index).split('\n').length;

      // Avoid duplicates
      if (!resolvers.find((r) => r.name === name && r.file === parsedFile.path)) {
        resolvers.push({
          id: `graphql-resolver:${parsedFile.path}:${type}:${name}`,
          type,
          name,
          file: parsedFile.path,
          line,
        });
      }
    }
  }

  // Detect NestJS GraphQL resolvers (TypeScript)
  // Pattern: @Query(() => ReturnType) resolverName(...)
  const nestjsQueryPattern = /@Query\([^)]*\)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g;
  while ((match = nestjsQueryPattern.exec(content)) !== null) {
    const name = match[1];
    const line = content.substring(0, match.index).split('\n').length;

    resolvers.push({
      id: `graphql-resolver:${parsedFile.path}:Query:${name}`,
      type: 'Query',
      name,
      file: parsedFile.path,
      line,
    });
  }

  // Detect NestJS GraphQL mutations
  const nestjsMutationPattern = /@Mutation\([^)]*\)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g;
  while ((match = nestjsMutationPattern.exec(content)) !== null) {
    const name = match[1];
    const line = content.substring(0, match.index).split('\n').length;

    resolvers.push({
      id: `graphql-resolver:${parsedFile.path}:Mutation:${name}`,
      type: 'Mutation',
      name,
      file: parsedFile.path,
      line,
    });
  }

  return resolvers;
}

/**
 * Parse GraphQL schema file
 */
export function parseGraphQLSchema(schemaPath: string): GraphQLSchema | null {
  if (!fs.existsSync(schemaPath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(schemaPath, 'utf-8');
    const schema: GraphQLSchema = {
      queries: [],
      mutations: [],
      subscriptions: [],
      types: [],
    };

    // Parse Query type
    const queryMatch = content.match(/type\s+Query\s*\{([^}]+)\}/);
    if (queryMatch) {
      const queryFields = queryMatch[1];
      const fieldPattern = /(\w+)\s*\([^)]*\)\s*:\s*([^\n]+)/g;
      let fieldMatch;
      while ((fieldMatch = fieldPattern.exec(queryFields)) !== null) {
        schema.queries.push({
          id: `graphql-query:${fieldMatch[1]}`,
          type: 'Query',
          name: fieldMatch[1],
          file: schemaPath,
          line: 0,
          returnType: fieldMatch[2].trim(),
        });
      }
    }

    // Parse Mutation type
    const mutationMatch = content.match(/type\s+Mutation\s*\{([^}]+)\}/);
    if (mutationMatch) {
      const mutationFields = mutationMatch[1];
      const fieldPattern = /(\w+)\s*\([^)]*\)\s*:\s*([^\n]+)/g;
      let fieldMatch;
      while ((fieldMatch = fieldPattern.exec(mutationFields)) !== null) {
        schema.mutations.push({
          id: `graphql-mutation:${fieldMatch[1]}`,
          type: 'Mutation',
          name: fieldMatch[1],
          file: schemaPath,
          line: 0,
          returnType: fieldMatch[2].trim(),
        });
      }
    }

    // Parse custom types
    const typePattern = /type\s+(\w+)\s*\{([^}]+)\}/g;
    let typeMatch;
    while ((typeMatch = typePattern.exec(content)) !== null) {
      if (typeMatch[1] !== 'Query' && typeMatch[1] !== 'Mutation' && typeMatch[1] !== 'Subscription') {
        const fields: Array<{ name: string; type: string }> = [];
        const fieldsContent = typeMatch[2];
        const fieldPattern = /(\w+)\s*:\s*([^\n]+)/g;
        let fieldMatch;
        while ((fieldMatch = fieldPattern.exec(fieldsContent)) !== null) {
          fields.push({
            name: fieldMatch[1],
            type: fieldMatch[2].trim(),
          });
        }

        schema.types.push({
          name: typeMatch[1],
          fields,
        });
      }
    }

    return schema;
  } catch (error) {
    return null;
  }
}

/**
 * Find GraphQL schema files in repository
 */
export function findGraphQLSchemaFiles(repoPath: string): string[] {
  const schemaFiles: string[] = [];
  const schemaPatterns = [
    '**/*.graphql',
    '**/*.gql',
    '**/schema.graphql',
    '**/schema.gql',
    '**/schema.ts', // Code-first schemas
    '**/schema.js',
  ];

  function searchDirectory(dir: string, depth: number = 0): void {
    if (depth > 10) return; // Limit recursion

    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        // Skip node_modules and .git
        if (entry.name === 'node_modules' || entry.name === '.git') {
          continue;
        }

        if (entry.isDirectory()) {
          searchDirectory(fullPath, depth + 1);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (['.graphql', '.gql', '.ts', '.js'].includes(ext)) {
            if (
              entry.name.includes('schema') ||
              entry.name.includes('graphql') ||
              ext === '.graphql' ||
              ext === '.gql'
            ) {
              schemaFiles.push(fullPath);
            }
          }
        }
      }
    } catch (error) {
      // Skip directories we can't read
    }
  }

  searchDirectory(repoPath);
  return schemaFiles;
}

