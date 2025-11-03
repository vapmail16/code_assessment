/**
 * Accuracy validation test cases with expected results
 */

import { ValidationTestCase } from './accuracy';

/**
 * Real-world test cases for validation
 * These should be based on actual repositories with known lineage
 */
export const accuracyTestCases: ValidationTestCase[] = [
  {
    id: 'react-express-postgres-1',
    description: 'Simple React + Express + PostgreSQL stack with user management',
    repository: 'test/react-express-user-app',
    expectedConnections: [
      // Frontend to Backend
      {
        from: 'component:UserProfile',
        to: 'endpoint:GET /api/users/:id',
        type: 'api-call',
        confidence: 0.8,
      },
      {
        from: 'component:UserList',
        to: 'endpoint:GET /api/users',
        type: 'api-call',
        confidence: 0.9,
      },
      {
        from: 'component:CreateUser',
        to: 'endpoint:POST /api/users',
        type: 'api-call',
        confidence: 0.9,
      },
      // Backend to Database
      {
        from: 'endpoint:GET /api/users/:id',
        to: 'query:user-find-by-id',
        type: 'database-query',
        confidence: 0.85,
      },
      {
        from: 'query:user-find-by-id',
        to: 'table:users',
        type: 'database-query',
        confidence: 1.0,
      },
      {
        from: 'endpoint:POST /api/users',
        to: 'query:user-create',
        type: 'database-query',
        confidence: 0.9,
      },
      {
        from: 'query:user-create',
        to: 'table:users',
        type: 'database-query',
        confidence: 1.0,
      },
    ],
    expectedImpact: {
      change: 'Modify GET /api/users/:id endpoint to return additional fields',
      affectedFiles: [
        'src/routes/users.ts',
        'src/services/userService.ts',
        'src/components/UserProfile.tsx',
        'src/types/user.ts',
      ],
      breakingChanges: 0,
    },
  },
  {
    id: 'vue-fastapi-mongodb-1',
    description: 'Vue.js + FastAPI + MongoDB e-commerce application',
    repository: 'test/vue-fastapi-ecommerce',
    expectedConnections: [
      {
        from: 'component:ProductList',
        to: 'endpoint:GET /api/products',
        type: 'api-call',
        confidence: 0.85,
      },
      {
        from: 'endpoint:GET /api/products',
        to: 'query:product-find-all',
        type: 'database-query',
        confidence: 0.8,
      },
      {
        from: 'query:product-find-all',
        to: 'table:products',
        type: 'database-query',
        confidence: 1.0,
      },
      {
        from: 'component:Cart',
        to: 'endpoint:POST /api/cart/add',
        type: 'api-call',
        confidence: 0.9,
      },
    ],
    expectedImpact: {
      change: 'Add authentication requirement to cart endpoints',
      affectedFiles: [
        'src/api/cart.py',
        'src/components/Cart.vue',
        'src/middleware/auth.py',
        'src/services/cartService.ts',
      ],
      breakingChanges: 1,
    },
  },
  {
    id: 'react-nextjs-graphql-1',
    description: 'React + Next.js + GraphQL + Prisma',
    repository: 'test/react-nextjs-graphql-app',
    expectedConnections: [
      {
        from: 'component:BlogPost',
        to: 'endpoint:POST /api/graphql',
        type: 'api-call',
        confidence: 0.7, // GraphQL is harder to trace
      },
      {
        from: 'query:blog-post-query',
        to: 'query:prisma-post-find',
        type: 'database-query',
        confidence: 0.75,
      },
      {
        from: 'query:prisma-post-find',
        to: 'table:Post',
        type: 'database-query',
        confidence: 1.0,
      },
    ],
    expectedImpact: {
      change: 'Add new field "tags" to BlogPost model',
      affectedFiles: [
        'prisma/schema.prisma',
        'src/graphql/schemas/post.ts',
        'src/components/BlogPost.tsx',
        'src/graphql/queries/posts.ts',
      ],
      breakingChanges: 0,
    },
  },
  {
    id: 'angular-nestjs-postgres-2',
    description: 'Angular + NestJS + PostgreSQL with authentication',
    repository: 'test/angular-nestjs-auth',
    expectedConnections: [
      {
        from: 'component:LoginForm',
        to: 'endpoint:POST /api/auth/login',
        type: 'api-call',
        confidence: 0.9,
      },
      {
        from: 'endpoint:POST /api/auth/login',
        to: 'query:user-find-by-email',
        type: 'database-query',
        confidence: 0.85,
      },
      {
        from: 'endpoint:POST /api/auth/login',
        to: 'query:session-create',
        type: 'database-query',
        confidence: 0.8,
      },
      {
        from: 'query:user-find-by-email',
        to: 'table:users',
        type: 'database-query',
        confidence: 1.0,
      },
      {
        from: 'query:session-create',
        to: 'table:sessions',
        type: 'database-query',
        confidence: 1.0,
      },
    ],
    expectedImpact: {
      change: 'Add password reset functionality',
      affectedFiles: [
        'src/auth/auth.controller.ts',
        'src/auth/auth.service.ts',
        'src/components/PasswordReset.ts',
        'src/database/migrations',
      ],
      breakingChanges: 0,
    },
  },
  {
    id: 'simple-rest-api-1',
    description: 'Minimal REST API with frontend and backend separation',
    repository: 'test/simple-rest-api',
    expectedConnections: [
      {
        from: 'component:DataTable',
        to: 'endpoint:GET /api/data',
        type: 'api-call',
        confidence: 0.95,
      },
      {
        from: 'endpoint:GET /api/data',
        to: 'query:data-select-all',
        type: 'database-query',
        confidence: 0.9,
      },
      {
        from: 'query:data-select-all',
        to: 'table:data_items',
        type: 'database-query',
        confidence: 1.0,
      },
    ],
    expectedImpact: {
      change: 'Change data table schema (remove column)',
      affectedFiles: [
        'backend/src/models/dataItem.js',
        'backend/src/routes/data.js',
        'frontend/src/components/DataTable.tsx',
        'database/migrations',
      ],
      breakingChanges: 1,
    },
  },
];

/**
 * Create test cases for a specific repository structure
 */
export function createTestCaseForRepo(
  repoId: string,
  structure: {
    frontend: { component: string; apiCall: string };
    backend: { endpoint: string; query: string };
    database: { table: string };
  }
): ValidationTestCase {
  return {
    id: `custom-${repoId.replace(/[^a-zA-Z0-9]/g, '-')}`,
    description: `Custom test case for ${repoId}`,
    repository: repoId,
    expectedConnections: [
      {
        from: `component:${structure.frontend.component}`,
        to: `endpoint:${structure.backend.endpoint}`,
        type: 'api-call',
        confidence: 0.8,
      },
      {
        from: `endpoint:${structure.backend.endpoint}`,
        to: `query:${structure.backend.query}`,
        type: 'database-query',
        confidence: 0.85,
      },
      {
        from: `query:${structure.backend.query}`,
        to: `table:${structure.database.table}`,
        type: 'database-query',
        confidence: 1.0,
      },
    ],
  };
}

/**
 * Get test cases for a specific tech stack
 */
export function getTestCasesForStack(
  frontend?: string,
  backend?: string,
  database?: string
): ValidationTestCase[] {
  return accuracyTestCases.filter((testCase) => {
    const desc = testCase.description.toLowerCase();
    const hasFrontend = !frontend || desc.includes(frontend.toLowerCase());
    const hasBackend = !backend || desc.includes(backend.toLowerCase());
    const hasDatabase = !database || desc.includes(database.toLowerCase());
    return hasFrontend && hasBackend && hasDatabase;
  });
}

