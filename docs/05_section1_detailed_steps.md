# Section 1: Project Setup & Foundation - Detailed Implementation Steps

## Overview

This document provides detailed, actionable steps to implement Section 1 of the MVP: Project Setup & Foundation. This section establishes the project structure, technology choices, and core data models.

## Section 1.1: Project Structure Setup

### Goal
Create a well-organized, scalable project structure that supports the entire codebase.

### Step-by-Step Instructions

#### Step 1.1.1: Initialize Project Repository
**Time**: 30 minutes

**Actions**:
1. Navigate to project directory
2. Initialize git repository: `git init`
3. Create initial `.gitignore` file with common patterns:
   ```
   node_modules/
   .env
   dist/
   build/
   *.log
   .DS_Store
   coverage/
   .idea/
   .vscode/
   ```
4. Create initial `README.md` with project description
5. Commit initial setup: `git commit -m "Initial project setup"`

**Deliverable**: Git repository initialized with basic files

---

#### Step 1.1.2: Choose Project Structure Type
**Time**: 1 hour

**Decision**: Monorepo vs Single Repository

**Monorepo Approach** (if multi-language):
```
code_assessment/
├── packages/
│   ├── core/           # Core analysis engine
│   ├── github/         # GitHub integration
│   ├── analyzers/      # Language-specific analyzers
│   ├── visualization/  # Visualization components
│   └── cli/            # CLI interface
├── apps/
│   └── web/            # Web UI (future)
└── package.json        # Root package.json
```

**Single Repo Approach** (recommended for MVP):
```
code_assessment/
├── src/
│   ├── github/
│   ├── detection/
│   ├── analyzers/
│   ├── lineage/
│   ├── impact/
│   ├── reporting/
│   └── visualization/
├── config/
├── tests/
├── docs/
├── scripts/
├── package.json
└── tsconfig.json (if TypeScript)
```

**Recommendation**: Start with Single Repo for MVP, can refactor to monorepo later if needed.

**Actions**:
1. Create root directory structure
2. Create all main directories (empty for now)
3. Document structure decision in docs/architecture.md

**Deliverable**: Directory structure created

---

#### Step 1.1.3: Create Detailed Directory Structure
**Time**: 1 hour

**Actions**: Create the following directory structure:

```
code_assessment/
├── src/
│   ├── github/
│   │   ├── api.ts              # GitHub API client
│   │   ├── clone.ts            # Repository cloning
│   │   ├── auth.ts             # Authentication
│   │   └── types.ts            # GitHub types
│   │
│   ├── detection/
│   │   ├── tech-stack.ts       # Main detection engine
│   │   ├── frameworks/        # Framework-specific detectors
│   │   │   ├── react.ts
│   │   │   ├── vue.ts
│   │   │   ├── express.ts
│   │   │   └── python.ts
│   │   └── types.ts
│   │
│   ├── analyzers/
│   │   ├── frontend/
│   │   │   ├── parser.ts       # Frontend parser
│   │   │   ├── api-detector.ts # API call detection
│   │   │   ├── graph-builder.ts
│   │   │   └── types.ts
│   │   │
│   │   ├── backend/
│   │   │   ├── parser.ts       # Backend parser
│   │   │   ├── endpoint-extractor.ts
│   │   │   ├── query-detector.ts
│   │   │   ├── graph-builder.ts
│   │   │   └── types.ts
│   │   │
│   │   └── database/
│   │       ├── schema-extractor.ts
│   │       ├── migration-parser.ts
│   │       ├── orm-detector.ts
│   │       └── types.ts
│   │
│   ├── lineage/
│   │   ├── graph-builder.ts    # Main graph builder
│   │   ├── connectors/
│   │   │   ├── frontend-backend.ts
│   │   │   └── backend-database.ts
│   │   ├── matcher.ts          # Pattern matching
│   │   └── types.ts
│   │
│   ├── impact/
│   │   ├── parser.ts           # Change request parser
│   │   ├── traversal.ts        # Graph traversal
│   │   ├── breaking-changes.ts
│   │   └── types.ts
│   │
│   ├── assessment/
│   │   ├── security/
│   │   │   ├── scanner.ts
│   │   │   └── integrations.ts
│   │   ├── quality/
│   │   │   ├── linter.ts
│   │   │   └── rules.ts
│   │   ├── architecture/
│   │   │   └── patterns.ts
│   │   └── types.ts
│   │
│   ├── reporting/
│   │   ├── generator.ts         # Main report generator
│   │   ├── templates/
│   │   │   ├── assessment.md
│   │   │   ├── lineage.md
│   │   │   └── impact.md
│   │   └── types.ts
│   │
│   ├── visualization/
│   │   ├── renderer.ts         # Graph renderer
│   │   ├── layouts/
│   │   │   ├── hierarchical.ts
│   │   │   └── force-directed.ts
│   │   └── types.ts
│   │
│   ├── utils/
│   │   ├── file-utils.ts
│   │   ├── graph-utils.ts
│   │   └── logger.ts
│   │
│   └── index.ts                # Main entry point
│
├── config/
│   ├── detection-rules.json    # Detection patterns
│   ├── assessment-rules.json   # Assessment rules
│   └── default-config.json     # Default configuration
│
├── tests/
│   ├── unit/
│   │   ├── analyzers/
│   │   ├── detection/
│   │   └── lineage/
│   ├── integration/
│   │   └── end-to-end.test.ts
│   └── fixtures/
│       └── sample-repos/       # Test repositories
│
├── docs/
│   ├── architecture.md
│   ├── api.md
│   └── development.md
│
├── scripts/
│   ├── setup.sh                # Setup script
│   ├── test.sh                  # Test runner
│   └── build.sh                 # Build script
│
├── .github/
│   └── workflows/
│       └── ci.yml              # CI/CD configuration
│
├── package.json
├── tsconfig.json               # TypeScript config
├── .eslintrc.json             # ESLint config
├── .prettierrc                # Prettier config
└── README.md
```

**Actions**:
1. Create all directories listed above
2. Create placeholder `.gitkeep` files in empty directories (to commit empty dirs)
3. Verify structure matches plan

**Deliverable**: Complete directory structure created

---

#### Step 1.1.4: Set Up Build/Compilation System
**Time**: 2-3 hours

**If using TypeScript/Node.js**:

**Actions**:
1. Initialize npm: `npm init -y`
2. Install TypeScript: `npm install --save-dev typescript @types/node`
3. Create `tsconfig.json`:
   ```json
   {
     "compilerOptions": {
       "target": "ES2020",
       "module": "commonjs",
       "lib": ["ES2020"],
       "outDir": "./dist",
       "rootDir": "./src",
       "strict": true,
       "esModuleInterop": true,
       "skipLibCheck": true,
       "forceConsistentCasingInFileNames": true,
       "resolveJsonModule": true,
       "moduleResolution": "node"
     },
     "include": ["src/**/*"],
     "exclude": ["node_modules", "tests", "dist"]
   }
   ```
4. Add build scripts to `package.json`:
   ```json
   {
     "scripts": {
       "build": "tsc",
       "build:watch": "tsc --watch",
       "clean": "rm -rf dist"
     }
   }
   ```
5. Test build: `npm run build`

**If using Python**:
1. Create `setup.py` or `pyproject.toml`
2. Set up virtual environment: `python -m venv venv`
3. Install build tools: `pip install setuptools wheel`
4. Create basic package structure

**Deliverable**: Build system configured and working

---

#### Step 1.1.5: Configure Development Environment
**Time**: 1-2 hours

**Actions**:

1. **Set up ESLint** (for TypeScript/JavaScript):
   ```bash
   npm install --save-dev eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin
   ```
   Create `.eslintrc.json`:
   ```json
   {
     "parser": "@typescript-eslint/parser",
     "extends": ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
     "rules": {
       "@typescript-eslint/no-explicit-any": "warn"
     }
   }
   ```

2. **Set up Prettier**:
   ```bash
   npm install --save-dev prettier
   ```
   Create `.prettierrc`:
   ```json
   {
     "semi": true,
     "trailingComma": "es5",
     "singleQuote": true,
     "printWidth": 80,
     "tabWidth": 2
   }
   ```

3. **Add format scripts** to `package.json`:
   ```json
   {
     "scripts": {
       "format": "prettier --write \"src/**/*.ts\"",
       "lint": "eslint src/**/*.ts",
       "lint:fix": "eslint src/**/*.ts --fix"
     }
   }
   ```

4. **Set up Git hooks** (optional, using husky):
   ```bash
   npm install --save-dev husky
   npx husky install
   npx husky add .husky/pre-commit "npm run lint"
   ```

**Deliverable**: Development environment configured with linting and formatting

---

#### Step 1.1.6: Version Control Setup
**Time**: 30 minutes

**Actions**:
1. Create `.gitignore` (if not already created):
   ```
   # Dependencies
   node_modules/
   venv/
   __pycache__/
   
   # Build outputs
   dist/
   build/
   *.pyc
   
   # Environment
   .env
   .env.local
   
   # IDE
   .vscode/
   .idea/
   *.swp
   *.swo
   
   # Logs
   *.log
   logs/
   
   # OS
   .DS_Store
   Thumbs.db
   
   # Testing
   coverage/
   .nyc_output/
   ```
2. Create initial commit:
   ```bash
   git add .
   git commit -m "Initial project structure setup"
   ```
3. (Optional) Set up GitHub repository and push

**Deliverable**: Version control initialized with proper ignore patterns

---

## Section 1.2: Technology Stack Selection

### Goal
Choose and document all core technologies needed for the project.

### Step-by-Step Instructions

#### Step 1.2.1: Choose Primary Programming Language
**Time**: 1 hour (research + decision)

**Options**:
1. **TypeScript/Node.js** (RECOMMENDED)
   - Pros: Strong typing, rich ecosystem, good performance, easy parsing
   - Cons: Runtime performance not as fast as native
   - Best for: Full-stack JavaScript/TypeScript analysis

2. **Python**
   - Pros: Great for AI/NLP (future), rich libraries, easy syntax
   - Cons: Slower performance, dynamic typing (harder for complex structures)
   - Best for: Research-heavy analysis, ML features

3. **Go**
   - Pros: Fast, good concurrency
   - Cons: Less mature parsing libraries
   - Best for: High-performance CLI tool

**Decision Matrix**:
- Parse multiple languages: ✅ TypeScript (Tree-sitter, Babel)
- Handle complex data structures: ✅ TypeScript (strong typing)
- Ecosystem for tools: ✅ TypeScript (npm ecosystem)
- Future AI features: ⚠️ Python better, but TypeScript can integrate

**Recommendation**: **TypeScript/Node.js**

**Actions**:
1. Document decision in `docs/technology-choices.md`
2. Include rationale and alternatives considered

**Deliverable**: Primary language chosen and documented

---

#### Step 1.2.2: Choose Dependency Management
**Time**: 30 minutes

**For TypeScript/Node.js**:

**Options**:
- **npm**: Default, comes with Node.js
- **yarn**: Faster, better lock files
- **pnpm**: Most efficient disk usage

**Recommendation**: Start with **npm** (default), can switch later if needed.

**Actions**:
1. Create `package.json` with basic structure:
   ```json
   {
     "name": "code-assessment",
     "version": "0.1.0",
     "description": "Code assessment and lineage analysis tool",
     "main": "dist/index.js",
     "scripts": {
       "build": "tsc",
       "start": "node dist/index.js"
     },
     "keywords": ["code-analysis", "lineage", "assessment"],
     "author": "",
     "license": "MIT"
   }
   ```
2. Document dependency management choice

**Deliverable**: Dependency management configured

---

#### Step 1.2.3: Choose Database (for Storing Results)
**Time**: 1 hour

**Options**:
1. **PostgreSQL** (RECOMMENDED)
   - Pros: Robust, good for complex queries, JSON support
   - Cons: Requires installation
   - Use case: Production, complex queries

2. **SQLite**
   - Pros: No setup, file-based, good for MVP
   - Cons: Limited concurrency, not ideal for large scale
   - Use case: MVP, development, simple storage

3. **In-Memory (JSON files)**
   - Pros: Simplest, no setup
   - Cons: No querying, limited for large data
   - Use case: MVP only, proof of concept

**Recommendation**: Start with **SQLite** for MVP, plan migration to PostgreSQL for production.

**Actions**:
1. Install SQLite library:
   ```bash
   npm install sqlite3
   # or for TypeScript
   npm install sqlite3 @types/sqlite3
   ```
2. (Optional) Set up PostgreSQL client for future:
   ```bash
   npm install pg @types/pg
   ```
3. Create database schema file: `src/database/schema.sql`
4. Document database choice and migration path

**Deliverable**: Database selected and library installed

---

#### Step 1.2.4: Choose Visualization Library
**Time**: 1-2 hours (research)

**Options**:
1. **D3.js** (RECOMMENDED)
   - Pros: Most flexible, powerful, great documentation
   - Cons: Steeper learning curve, more code required
   - Best for: Custom visualizations, full control

2. **Cytoscape.js**
   - Pros: Graph-focused, easier than D3, good layouts
   - Cons: Less flexible than D3
   - Best for: Graph visualizations, faster development

3. **vis.js**
   - Pros: Simplest, good for basic graphs
   - Cons: Less customizable, older library
   - Best for: Quick MVP, simple needs

**Recommendation**: Start with **Cytoscape.js** for MVP (faster to implement), consider D3.js for Phase 2 if more customization needed.

**Actions**:
1. Install visualization library:
   ```bash
   npm install cytoscape
   # For Node.js rendering (if needed)
   npm install cytoscape-svg
   ```
2. Create test visualization file: `src/visualization/test-renderer.ts`
3. Test basic graph rendering
4. Document choice

**Deliverable**: Visualization library chosen and tested

---

#### Step 1.2.5: Choose Testing Framework
**Time**: 1 hour

**For TypeScript/Node.js**:

**Options**:
- **Jest** (RECOMMENDED): Most popular, great TypeScript support
- **Mocha + Chai**: More flexible, older
- **Vitest**: Faster, modern, compatible with Jest

**Recommendation**: **Jest**

**Actions**:
1. Install Jest:
   ```bash
   npm install --save-dev jest @types/jest ts-jest
   ```
2. Create `jest.config.js`:
   ```javascript
   module.exports = {
     preset: 'ts-jest',
     testEnvironment: 'node',
     roots: ['<rootDir>/src', '<rootDir>/tests'],
     testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
     collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts'],
   };
   ```
3. Add test script to `package.json`:
   ```json
   {
     "scripts": {
       "test": "jest",
       "test:watch": "jest --watch",
       "test:coverage": "jest --coverage"
     }
   }
   ```
4. Create sample test: `tests/unit/utils.test.ts`
5. Run test: `npm test`

**Deliverable**: Testing framework configured and working

---

#### Step 1.2.6: Choose API Framework (if building web service)
**Time**: 1 hour (can defer if CLI-only for MVP)

**Options**:
1. **Express** (RECOMMENDED)
   - Pros: Most popular, simple, lots of middleware
   - Best for: REST APIs

2. **Fastify**
   - Pros: Faster than Express
   - Best for: High-performance APIs

3. **Koa**
   - Pros: Modern, async/await native
   - Best for: Modern async code

**Recommendation**: **Express** (most familiar, largest ecosystem)

**Actions**:
1. Install Express (if needed):
   ```bash
   npm install express
   npm install --save-dev @types/express
   ```
2. Create basic server file: `src/server.ts` (optional for MVP)
3. Document API framework choice

**Deliverable**: API framework chosen (if needed)

---

#### Step 1.2.7: Set Up CI/CD Basics
**Time**: 1 hour

**Actions**:
1. Create `.github/workflows/ci.yml`:
   ```yaml
   name: CI
   
   on:
     push:
       branches: [ main, develop ]
     pull_request:
       branches: [ main ]
   
   jobs:
     test:
       runs-on: ubuntu-latest
       
       steps:
       - uses: actions/checkout@v2
       
       - name: Setup Node.js
         uses: actions/setup-node@v2
         with:
           node-version: '18'
       
       - name: Install dependencies
         run: npm ci
       
       - name: Run linter
         run: npm run lint
       
       - name: Run tests
         run: npm test
       
       - name: Build
         run: npm run build
   ```
2. Test CI by pushing to repository
3. Document CI/CD setup

**Deliverable**: CI/CD pipeline configured

---

#### Step 1.2.8: Document Technology Stack
**Time**: 1 hour

**Actions**:
1. Create `docs/technology-stack.md`:
   ```markdown
   # Technology Stack
   
   ## Core
   - **Language**: TypeScript/Node.js
   - **Package Manager**: npm
   - **Build Tool**: TypeScript Compiler (tsc)
   
   ## Database
   - **MVP**: SQLite
   - **Production**: PostgreSQL (migration path planned)
   
   ## Visualization
   - **MVP**: Cytoscape.js
   - **Future**: D3.js (if more customization needed)
   
   ## Testing
   - **Framework**: Jest
   - **Coverage**: Jest coverage reports
   
   ## Development Tools
   - **Linting**: ESLint
   - **Formatting**: Prettier
   - **CI/CD**: GitHub Actions
   
   ## Key Dependencies (to be installed)
   - Tree-sitter (parsing)
   - GitHub API SDK
   - SQLite3
   - Cytoscape.js
   - Jest
   ```

2. Update `README.md` with technology stack information

**Deliverable**: Technology stack documented

---

## Section 1.3: Core Data Models Design

### Goal
Design and implement TypeScript interfaces/types for all core data structures.

### Step-by-Step Instructions

#### Step 1.3.1: Create Types Directory Structure
**Time**: 30 minutes

**Actions**:
1. Create `src/types/` directory
2. Create type definition files:
   - `src/types/repository.ts` - Repository types
   - `src/types/detection.ts` - Tech stack detection types
   - `src/types/analysis.ts` - Analysis result types
   - `src/types/lineage.ts` - Graph/lineage types
   - `src/types/assessment.ts` - Assessment types
   - `src/types/impact.ts` - Impact analysis types
   - `src/types/common.ts` - Common/shared types
   - `src/types/index.ts` - Export all types

3. Create index file to export all:
   ```typescript
   // src/types/index.ts
   export * from './repository';
   export * from './detection';
   export * from './analysis';
   export * from './lineage';
   export * from './assessment';
   export * from './impact';
   export * from './common';
   ```

**Deliverable**: Type definition structure created

---

#### Step 1.3.2: Design Repository Models
**Time**: 2 hours

**Actions**: Create `src/types/repository.ts`:

```typescript
/**
 * Core repository types
 */

export interface Repository {
  id: string;
  url: string;
  name: string;
  owner: string;
  description?: string;
  branch: string;
  defaultBranch: string;
  cloneUrl: string;
  localPath?: string; // Path where repo is cloned locally
  createdAt: Date;
  updatedAt: Date;
  metadata: RepositoryMetadata;
}

export interface RepositoryMetadata {
  size: number; // in bytes
  languages: LanguageStats[];
  fileCount: number;
  lastCommit?: {
    sha: string;
    message: string;
    author: string;
    date: Date;
  };
}

export interface LanguageStats {
  language: string;
  bytes: number;
  percentage: number;
}

export interface FileNode {
  path: string;
  relativePath: string;
  name: string;
  type: 'file' | 'directory';
  size: number;
  language?: string;
  content?: string; // Content if file is small enough
  children?: FileNode[]; // If directory
  extension?: string;
  encoding?: string;
}

export interface FileTree {
  root: FileNode;
  files: Map<string, FileNode>; // path -> FileNode
  totalFiles: number;
  totalSize: number;
}
```

**Deliverable**: Repository types defined

---

#### Step 1.3.3: Design Detection Models
**Time**: 2 hours

**Actions**: Create `src/types/detection.ts`:

```typescript
/**
 * Tech stack detection types
 */

export interface TechStack {
  frontend?: Framework[];
  backend?: Framework[];
  database?: Database[];
  buildTools?: BuildTool[];
  testing?: TestingTool[];
  overallConfidence: number; // 0-1
  detectedAt: Date;
}

export interface Framework {
  name: string;
  type: 'frontend' | 'backend' | 'database' | 'build' | 'test';
  version?: string;
  confidence: number; // 0-1
  indicators: DetectionIndicator[];
  files: string[]; // Files that indicate this framework
}

export interface DetectionIndicator {
  type: 'package-file' | 'import' | 'config-file' | 'file-extension' | 'pattern';
  value: string;
  confidence: number;
  source: string; // File or pattern where found
}

export interface Database {
  name: string;
  type: 'relational' | 'nosql' | 'graph' | 'key-value';
  orm?: string; // e.g., 'sequelize', 'prisma', 'sqlalchemy'
  version?: string;
  confidence: number;
  connectionString?: string; // If found in config
}

export interface BuildTool {
  name: string;
  type: 'package-manager' | 'bundler' | 'compiler';
  version?: string;
  configFiles: string[];
}

export interface TestingTool {
  name: string;
  framework?: string; // e.g., 'jest', 'pytest'
  version?: string;
  configFiles: string[];
}
```

**Deliverable**: Detection types defined

---

#### Step 1.3.4: Design Analysis Models
**Time**: 3 hours

**Actions**: Create `src/types/analysis.ts`:

```typescript
/**
 * Code analysis types
 */

export interface AnalysisResult {
  repository: string;
  timestamp: Date;
  frontend?: FrontendAnalysis;
  backend?: BackendAnalysis;
  database?: DatabaseAnalysis;
  errors: AnalysisError[];
}

export interface FrontendAnalysis {
  files: ParsedFile[];
  components: Component[];
  apiCalls: APICall[];
  dependencyGraph: DependencyGraph;
  routing?: RoutingInfo;
}

export interface BackendAnalysis {
  files: ParsedFile[];
  endpoints: Endpoint[];
  databaseQueries: DatabaseQuery[];
  services: Service[];
  dependencyGraph: DependencyGraph;
  middleware: Middleware[];
}

export interface DatabaseAnalysis {
  schema: DatabaseSchema;
  tables: Table[];
  relationships: Relationship[];
  usageMap: TableUsageMap; // Which backend code uses which tables
}

export interface ParsedFile {
  path: string;
  language: string;
  ast?: any; // AST node (type depends on parser)
  imports: Import[];
  exports: Export[];
  functions?: FunctionDefinition[];
  classes?: ClassDefinition[];
  linesOfCode: number;
  complexity?: number;
}

export interface Import {
  from: string;
  default?: string;
  named?: string[];
  type: 'import' | 'require' | 'dynamic';
  line: number;
}

export interface Export {
  name: string;
  type: 'default' | 'named';
  line: number;
}

export interface Component {
  name: string;
  file: string;
  type: 'functional' | 'class' | 'hook' | 'context';
  props?: string[];
  state?: string[];
  hooks?: string[];
  line: number;
  column: number;
}

export interface APICall {
  id: string;
  file: string;
  function?: string; // Function/component containing the call
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'GRAPHQL';
  url: string | null; // null if dynamic/unresolvable
  urlPattern?: string; // Pattern if dynamic
  headers?: Record<string, string>;
  body?: any;
  line: number;
  column: number;
  confidence: number; // Confidence that URL is correctly identified
}

export interface Endpoint {
  id: string;
  file: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'GRAPHQL';
  path: string;
  pathPattern: string; // Normalized pattern
  handler: string; // Function name
  line: number;
  parameters: EndpointParameter[];
  middleware: string[]; // Middleware names
  responseType?: string;
}

export interface EndpointParameter {
  name: string;
  type: 'path' | 'query' | 'body' | 'header';
  required: boolean;
  typeHint?: string; // TypeScript type if available
}

export interface DatabaseQuery {
  id: string;
  file: string;
  function?: string;
  type: 'select' | 'insert' | 'update' | 'delete' | 'raw';
  table?: string; // If identifiable
  tables?: string[]; // Tables involved
  sql?: string; // If raw SQL
  ormMethod?: string; // e.g., 'findAll', 'create'
  line: number;
  confidence: number;
}

export interface Service {
  name: string;
  file: string;
  methods: string[];
  dependencies: string[]; // Other services/modules it depends on
}

export interface Middleware {
  name: string;
  file: string;
  appliedTo: string[]; // Endpoint IDs or patterns
  order?: number;
}

export interface Table {
  name: string;
  schema?: string;
  columns: Column[];
  indexes: Index[];
  foreignKeys: ForeignKey[];
  primaryKey?: string[];
}

export interface Column {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: any;
  constraints?: string[];
}

export interface Index {
  name: string;
  columns: string[];
  unique: boolean;
}

export interface ForeignKey {
  column: string;
  referencedTable: string;
  referencedColumn: string;
}

export interface Relationship {
  from: string; // Table name
  to: string; // Table name
  type: 'one-to-one' | 'one-to-many' | 'many-to-many';
  foreignKey?: string;
}

export interface TableUsageMap {
  [tableName: string]: {
    endpoints: string[]; // Endpoint IDs
    queries: string[]; // Query IDs
    readOperations: number;
    writeOperations: number;
  };
}

export interface DependencyGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface GraphNode {
  id: string;
  type: 'file' | 'component' | 'function' | 'endpoint' | 'service' | 'module';
  name: string;
  file?: string;
  line?: number;
  metadata: Record<string, any>;
}

export interface GraphEdge {
  from: string; // Node ID
  to: string; // Node ID
  type: 'import' | 'call' | 'extends' | 'uses';
  metadata: Record<string, any>;
}

export interface RoutingInfo {
  framework: 'react-router' | 'vue-router' | 'angular-router';
  routes: Route[];
}

export interface Route {
  path: string;
  component: string;
  file: string;
}

export interface AnalysisError {
  type: 'parse-error' | 'detection-error' | 'analysis-error';
  message: string;
  file?: string;
  line?: number;
  stack?: string;
}
```

**Deliverable**: Analysis types defined

---

#### Step 1.3.5: Design Lineage Graph Models
**Time**: 2 hours

**Actions**: Create `src/types/lineage.ts`:

```typescript
/**
 * Lineage graph types
 */

export interface LineageGraph {
  nodes: LineageNode[];
  edges: LineageEdge[];
  layers: {
    frontend: LineageNode[];
    backend: LineageNode[];
    database: LineageNode[];
  };
  metadata: GraphMetadata;
}

export interface LineageNode {
  id: string;
  type: LineageNodeType;
  layer: 'frontend' | 'backend' | 'database';
  label: string;
  file: string;
  line?: number;
  data: NodeData;
}

export type LineageNodeType =
  | 'component'      // Frontend component
  | 'page'           // Frontend page/route
  | 'api-call'       // Frontend API call point
  | 'endpoint'       // Backend API endpoint
  | 'service'        // Backend service
  | 'controller'     // Backend controller
  | 'database-query' // Backend database query
  | 'table'          // Database table
  | 'schema';        // Database schema

export interface NodeData {
  // Component data
  componentName?: string;
  props?: string[];
  
  // Endpoint data
  httpMethod?: string;
  path?: string;
  parameters?: string[];
  
  // Table data
  tableName?: string;
  columns?: string[];
  
  // Generic metadata
  [key: string]: any;
}

export interface LineageEdge {
  id: string;
  from: string; // Node ID
  to: string; // Node ID
  type: LineageEdgeType;
  label?: string;
  confidence: number; // 0-1, confidence in connection
  data: EdgeData;
}

export type LineageEdgeType =
  | 'api-call'        // Frontend → Backend API call
  | 'database-query'  // Backend → Database query
  | 'data-flow'       // Generic data flow
  | 'navigation'      // Frontend route navigation
  | 'dependency';     // Code dependency

export interface EdgeData {
  // API call data
  method?: string;
  url?: string;
  statusCode?: number;
  
  // Database query data
  queryType?: string;
  table?: string;
  
  // Generic metadata
  [key: string]: any;
}

export interface GraphMetadata {
  totalNodes: number;
  totalEdges: number;
  nodeCounts: Record<LineageNodeType, number>;
  edgeCounts: Record<LineageEdgeType, number>;
  confidence: {
    average: number;
    min: number;
    max: number;
    distribution: number[]; // Histogram of confidence scores
  };
  disconnectedComponents: number;
  longestPath: number;
}
```

**Deliverable**: Lineage graph types defined

---

#### Step 1.3.6: Design Assessment Models
**Time**: 2 hours

**Actions**: Create `src/types/assessment.ts`:

```typescript
/**
 * Code assessment types
 */

export interface AssessmentResult {
  repository: string;
  timestamp: Date;
  security: SecurityAssessment;
  quality: QualityAssessment;
  architecture: ArchitectureAssessment;
  summary: AssessmentSummary;
}

export interface AssessmentSummary {
  overallScore: number; // 0-100
  securityScore: number;
  qualityScore: number;
  architectureScore: number;
  totalIssues: number;
  criticalIssues: number;
  highIssues: number;
  mediumIssues: number;
  lowIssues: number;
}

export interface SecurityAssessment {
  issues: SecurityIssue[];
  vulnerabilities: Vulnerability[];
  dependencies: DependencySecurity[];
  score: number; // 0-100
}

export interface SecurityIssue {
  id: string;
  type: SecurityIssueType;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  file: string;
  line: number;
  column?: number;
  rule: string; // Rule identifier
  recommendation: string;
  codeSnippet?: string;
}

export type SecurityIssueType =
  | 'sql-injection'
  | 'xss'
  | 'csrf'
  | 'authentication'
  | 'authorization'
  | 'sensitive-data'
  | 'crypto'
  | 'insecure-dependency'
  | 'other';

export interface Vulnerability {
  id: string;
  cve?: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  affectedFiles: string[];
  fixAvailable: boolean;
  fixVersion?: string;
}

export interface DependencySecurity {
  name: string;
  version: string;
  vulnerabilities: Vulnerability[];
  latestVersion: string;
  outdated: boolean;
}

export interface QualityAssessment {
  issues: QualityIssue[];
  metrics: CodeMetrics;
  score: number;
}

export interface QualityIssue {
  id: string;
  type: QualityIssueType;
  severity: 'error' | 'warning' | 'info';
  title: string;
  description: string;
  file: string;
  line: number;
  column?: number;
  rule: string;
  recommendation: string;
  codeSnippet?: string;
}

export type QualityIssueType =
  | 'code-style'
  | 'complexity'
  | 'duplication'
  | 'performance'
  | 'maintainability'
  | 'best-practice'
  | 'documentation'
  | 'other';

export interface CodeMetrics {
  linesOfCode: number;
  cyclomaticComplexity: number;
  maintainabilityIndex: number;
  technicalDebt: number; // in hours
  codeDuplication: number; // percentage
  testCoverage?: number; // percentage, if available
}

export interface ArchitectureAssessment {
  issues: ArchitectureIssue[];
  patterns: Pattern[];
  antiPatterns: AntiPattern[];
  score: number;
}

export interface ArchitectureIssue {
  id: string;
  type: ArchitectureIssueType;
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  affectedFiles: string[];
  recommendation: string;
}

export type ArchitectureIssueType =
  | 'circular-dependency'
  | 'god-object'
  | 'large-file'
  | 'tight-coupling'
  | 'violation-of-layers'
  | 'missing-abstraction'
  | 'other';

export interface Pattern {
  name: string;
  type: 'design-pattern' | 'architectural-pattern';
  confidence: number;
  files: string[];
  description: string;
}

export interface AntiPattern {
  name: string;
  severity: 'high' | 'medium' | 'low';
  files: string[];
  description: string;
  recommendation: string;
}
```

**Deliverable**: Assessment types defined

---

#### Step 1.3.7: Design Impact Analysis Models
**Time**: 2 hours

**Actions**: Create `src/types/impact.ts`:

```typescript
/**
 * Impact analysis types
 */

export interface ImpactAnalysis {
  repository: string;
  timestamp: Date;
  changeRequest: ChangeRequest;
  affectedNodes: AffectedNode[];
  affectedFiles: string[];
  dependencyChain: DependencyChain;
  breakingChanges: BreakingChange[];
  recommendations: Recommendation[];
  summary: ImpactSummary;
}

export interface ChangeRequest {
  id: string;
  description: string;
  type: ChangeType;
  targetFiles: string[];
  targetComponents?: string[];
  targetEndpoints?: string[];
  targetTables?: string[];
  parsedIntent?: ParsedIntent;
}

export type ChangeType =
  | 'add-feature'
  | 'modify-feature'
  | 'remove-feature'
  | 'modify-api'
  | 'modify-schema'
  | 'refactor'
  | 'bug-fix'
  | 'other';

export interface ParsedIntent {
  entities: string[]; // Affected entities
  operations: string[]; // Operations (add, modify, delete)
  locations: string[]; // Locations mentioned
  confidence: number;
}

export interface AffectedNode {
  nodeId: string;
  nodeType: string;
  file: string;
  layer: 'frontend' | 'backend' | 'database';
  impactType: 'direct' | 'indirect';
  impactReason: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  depth: number; // How many hops from original change
}

export interface DependencyChain {
  chains: DependencyPath[];
  maxDepth: number;
  totalAffected: number;
}

export interface DependencyPath {
  from: string; // Starting node ID
  to: string; // Ending node ID
  nodes: string[]; // All nodes in path
  edges: string[]; // All edges in path
  type: 'forward' | 'backward'; // Forward = what depends on change, backward = what change depends on
}

export interface BreakingChange {
  id: string;
  type: BreakingChangeType;
  severity: 'critical' | 'high' | 'medium';
  description: string;
  affectedNode: string;
  file: string;
  line?: number;
  impact: string;
  migrationPath?: string;
}

export type BreakingChangeType =
  | 'api-parameter-removed'
  | 'api-parameter-added-required'
  | 'api-response-changed'
  | 'schema-column-removed'
  | 'schema-column-type-changed'
  | 'export-removed'
  | 'type-incompatibility'
  | 'other';

export interface Recommendation {
  id: string;
  type: RecommendationType;
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  affectedFiles: string[];
  suggestedChanges: CodeChange[];
  relatedFiles: string[];
}

export type RecommendationType =
  | 'code-change'
  | 'test-update'
  | 'documentation-update'
  | 'refactor'
  | 'migration'
  | 'review-required';

export interface CodeChange {
  file: string;
  type: 'add' | 'modify' | 'delete';
  location: {
    line: number;
    column?: number;
  };
  oldCode?: string;
  newCode: string;
  description: string;
}

export interface ImpactSummary {
  totalAffectedFiles: number;
  totalAffectedNodes: number;
  criticalImpact: number;
  highImpact: number;
  mediumImpact: number;
  lowImpact: number;
  breakingChangesCount: number;
  estimatedComplexity: 'low' | 'medium' | 'high';
  estimatedTime?: number; // in hours
}
```

**Deliverable**: Impact analysis types defined

---

#### Step 1.3.8: Create Common Types
**Time**: 1 hour

**Actions**: Create `src/types/common.ts`:

```typescript
/**
 * Common/shared types
 */

export interface Position {
  line: number;
  column: number;
}

export interface Range {
  start: Position;
  end: Position;
}

export interface Location {
  file: string;
  range?: Range;
  line?: number;
  column?: number;
}

export interface Confidence {
  value: number; // 0-1
  factors: ConfidenceFactor[];
}

export interface ConfidenceFactor {
  type: string;
  description: string;
  contribution: number; // How much this factor contributes
}

export interface Error {
  code: string;
  message: string;
  location?: Location;
  stack?: string;
  context?: Record<string, any>;
}

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export interface Metadata {
  [key: string]: any;
}
```

**Deliverable**: Common types defined

---

#### Step 1.3.9: Validate Types with TypeScript
**Time**: 1 hour

**Actions**:
1. Ensure all type files are properly exported in `src/types/index.ts`
2. Create a test file: `tests/types/type-validation.test.ts`:
   ```typescript
   import * as Types from '../../src/types';
   
   // Test that types compile correctly
   describe('Type Definitions', () => {
     it('should export all types', () => {
       // This test just ensures types compile
       const repo: Types.Repository = {
         id: 'test',
         url: 'https://github.com/test/repo',
         name: 'test',
         owner: 'test',
         branch: 'main',
         defaultBranch: 'main',
         cloneUrl: 'https://github.com/test/repo.git',
         createdAt: new Date(),
         updatedAt: new Date(),
         metadata: {
           size: 0,
           languages: [],
           fileCount: 0,
         },
       };
       expect(repo).toBeDefined();
     });
   });
   ```
3. Run TypeScript compiler: `npm run build`
4. Fix any type errors
5. Run tests: `npm test`

**Deliverable**: All types validated and compiling

---

#### Step 1.3.10: Document Data Models
**Time**: 2 hours

**Actions**:
1. Create `docs/data-models.md`:
   - Document each type interface
   - Explain relationships between types
   - Provide usage examples
   - Document any design decisions

2. Create ER diagram or type relationship diagram (optional, using Mermaid):
   ```markdown
   ## Type Relationships
   
   ```mermaid
   graph TD
     Repository --> TechStack
     Repository --> FileTree
     FileTree --> ParsedFile
     ParsedFile --> Component
     ParsedFile --> Endpoint
     Component --> APICall
     APICall --> Endpoint
     Endpoint --> DatabaseQuery
     DatabaseQuery --> Table
     ```

**Deliverable**: Data models documented

---

## Section 1 Completion Checklist

- [ ] Project structure created
- [ ] Build system configured
- [ ] Development environment set up (linting, formatting)
- [ ] Technology stack selected and documented
- [ ] All dependencies identified
- [ ] Core data models designed and implemented
- [ ] Type definitions compile without errors
- [ ] Documentation created
- [ ] Initial commit made to version control

## Estimated Time for Section 1

**Total**: 25-35 hours (approximately 1 week for one developer)

**Breakdown**:
- Project Structure: 6-8 hours
- Technology Selection: 6-8 hours
- Data Models: 13-19 hours

## Next Steps

After completing Section 1, proceed to:
- **Section 2**: GitHub Integration
- Set up GitHub API client
- Implement repository cloning
- Extract repository metadata

## Notes

- All time estimates are for a single developer
- Times can be parallelized if multiple developers work on different sections
- Some steps can be simplified for MVP and enhanced later
- Focus on getting types right early - they're the foundation for everything else

