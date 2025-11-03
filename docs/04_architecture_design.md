# Architecture Design

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        User Interface                         │
│  (CLI / Web UI / API)                                         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                     Analysis Orchestrator                     │
│  (Coordinates all analysis steps, manages workflow)          │
└─────────────────────────────────────────────────────────────┘
                            ↓
        ┌───────────────────┼───────────────────┐
        ↓                   ↓                   ↓
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│   GitHub      │  │   Detection   │  │   Analysis    │
│  Integration  │  │    Engine     │  │   Pipeline    │
└───────────────┘  └───────────────┘  └───────────────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                            ↓
        ┌───────────────────┼───────────────────┐
        ↓                   ↓                   ↓
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│   Frontend    │  │    Backend     │  │   Database    │
│   Analyzer    │  │   Analyzer     │  │   Analyzer    │
└───────────────┘  └───────────────┘  └───────────────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    Lineage Graph Builder                      │
│  (Connects all layers, builds unified graph)                 │
└─────────────────────────────────────────────────────────────┘
                            ↓
        ┌───────────────────┼───────────────────┐
        ↓                   ↓                   ↓
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│   Assessment  │  │   Impact      │  │ Visualization │
│    Engine     │  │   Analysis    │  │    Engine     │
└───────────────┘  └───────────────┘  └───────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                      Report Generator                         │
│  (Generates reports, documentation, visualizations)          │
└─────────────────────────────────────────────────────────────┘
```

## Component Details

### 1. GitHub Integration Layer

**Responsibility**: 
- Authenticate with GitHub
- Clone repositories
- Fetch repository metadata
- Handle rate limits and errors

**Key Functions**:
- `cloneRepository(repoId: string): Promise<Repository>`
- `getRepositoryMetadata(repoId: string): Promise<RepoMetadata>`
- `getFileTree(repoId: string, branch?: string): Promise<FileNode[]>`

**Dependencies**: 
- GitHub API SDK
- Git client

### 2. Tech Stack Detection Engine

**Responsibility**:
- Analyze repository to identify technologies
- Detect frameworks and versions
- Generate confidence scores

**Key Functions**:
- `detectTechStack(repo: Repository): Promise<TechStack>`
- `detectFramework(files: FileNode[]): Promise<Framework[]>`
- `calculateConfidence(indicators: Indicator[]): number`

**Detection Strategies**:
- Package manifest analysis (package.json, requirements.txt)
- File extension analysis
- Import/require pattern matching
- Configuration file detection

### 3. Frontend Analyzer

**Responsibility**:
- Parse frontend code files
- Extract components, hooks, imports
- Identify API calls
- Build frontend dependency graph

**Key Functions**:
- `parseFrontendFile(file: File): Promise<AST>`
- `extractAPICalls(ast: AST): Promise<APICall[]>`
- `buildDependencyGraph(files: File[]): Promise<Graph>`
- `extractComponents(ast: AST): Promise<Component[]>`

**Supported Formats**:
- JavaScript/TypeScript
- JSX/TSX (React)
- Vue SFC (Single File Components)

### 4. Backend Analyzer

**Responsibility**:
- Parse backend code files
- Extract API endpoints and routes
- Identify database queries
- Build backend dependency graph

**Key Functions**:
- `parseBackendFile(file: File): Promise<AST>`
- `extractEndpoints(ast: AST): Promise<Endpoint[]>`
- `extractDatabaseQueries(ast: AST): Promise<DatabaseQuery[]>`
- `buildDependencyGraph(files: File[]): Promise<Graph>`

**Supported Frameworks**:
- Node.js: Express, Fastify, Koa
- Python: FastAPI, Flask, Django
- GraphQL: Apollo, GraphQL.js

### 5. Database Analyzer

**Responsibility**:
- Extract database schema
- Parse migrations and models
- Map tables and relationships
- Track database usage

**Key Functions**:
- `extractSchema(migrations: File[]): Promise<Schema>`
- `parseORMModels(models: File[]): Promise<Model[]>`
- `mapTableUsage(queries: DatabaseQuery[]): Promise<TableUsageMap>`

**Supported Sources**:
- ORM model definitions
- Migration files
- SQL schema files
- Raw SQL queries

### 6. Lineage Graph Builder

**Responsibility**:
- Connect frontend API calls to backend endpoints
- Connect backend code to database tables
- Build unified graph structure
- Calculate connection confidence scores

**Key Functions**:
- `connectFrontendToBackend(frontend: Graph, backend: Graph): Promise<Edge[]>`
- `connectBackendToDatabase(backend: Graph, database: Schema): Promise<Edge[]>`
- `buildUnifiedGraph(layers: Layer[]): Promise<LineageGraph>`
- `calculateConnectionConfidence(call: APICall, endpoint: Endpoint): number`

**Connection Strategies**:
- URL pattern matching
- HTTP method matching
- Path parameter extraction
- Template string analysis
- Environment variable resolution

### 7. Assessment Engine

**Responsibility**:
- Run security scans
- Execute code quality checks
- Detect architecture patterns
- Generate assessment scores

**Key Functions**:
- `runSecurityScan(repo: Repository): Promise<SecurityIssue[]>`
- `runQualityChecks(files: File[]): Promise<QualityIssue[]>`
- `detectPatterns(graph: LineageGraph): Promise<Pattern[]>`
- `generateAssessmentReport(results: AssessmentResult[]): Promise<Report>`

**Integrated Tools**:
- ESLint / Pylint (linting)
- Semgrep / Bandit (security)
- SonarQube rules (quality)
- Custom pattern detectors

### 8. Impact Analysis Engine

**Responsibility**:
- Parse change requests
- Traverse dependency graph
- Identify affected components
- Detect breaking changes
- Generate impact report

**Key Functions**:
- `parseChangeRequest(request: string): Promise<ChangeRequest>`
- `findAffectedNodes(graph: LineageGraph, change: ChangeRequest): Promise<Node[]>`
- `detectBreakingChanges(change: ChangeRequest, graph: LineageGraph): Promise<BreakingChange[]>`
- `generateImpactReport(impact: ImpactAnalysis): Promise<Report>`

**Traversal Algorithms**:
- Forward dependency traversal (BFS)
- Backward dependency traversal (BFS)
- Conditional traversal based on edge types
- Depth-limited traversal

### 9. Visualization Engine

**Responsibility**:
- Render lineage graph
- Create interactive visualizations
- Highlight layers and connections
- Visualize impact analysis

**Key Functions**:
- `renderGraph(graph: LineageGraph): Promise<Visualization>`
- `applyLayout(graph: LineageGraph, layout: LayoutType): Promise<Layout>`
- `highlightImpact(graph: LineageGraph, impact: ImpactAnalysis): Promise<Visualization>`

**Visualization Libraries**:
- D3.js (recommended for flexibility)
- Cytoscape.js (graph-focused)
- vis.js (simpler, good for MVP)

### 10. Report Generator

**Responsibility**:
- Compile all analysis results
- Generate formatted reports
- Create documentation
- Export in various formats

**Key Functions**:
- `generateAssessmentReport(assessment: AssessmentResult): Promise<Report>`
- `generateLineageReport(graph: LineageGraph): Promise<Report>`
- `generateImpactReport(impact: ImpactAnalysis): Promise<Report>`
- `generateDocumentation(repo: Repository, analysis: AnalysisResult): Promise<Documentation>`

**Output Formats**:
- Markdown
- HTML
- JSON
- PDF (future)

## Data Models

### Core Models

```typescript
interface Repository {
  id: string;
  url: string;
  name: string;
  branch: string;
  techStack: TechStack;
  files: FileNode[];
}

interface TechStack {
  frontend?: Framework[];
  backend?: Framework[];
  database?: Database[];
  buildTools?: string[];
  confidence: number;
}

interface FileNode {
  path: string;
  content: string;
  language: string;
  ast?: AST;
  dependencies: string[];
}

interface LineageGraph {
  nodes: Node[];
  edges: Edge[];
  layers: {
    frontend: Node[];
    backend: Node[];
    database: Node[];
  };
}

interface Node {
  id: string;
  type: 'component' | 'endpoint' | 'table' | 'function' | 'module';
  layer: 'frontend' | 'backend' | 'database';
  file: string;
  line?: number;
  metadata: Record<string, any>;
}

interface Edge {
  from: string; // node id
  to: string; // node id
  type: 'api-call' | 'database-query' | 'import' | 'data-flow';
  confidence: number;
  metadata: Record<string, any>;
}

interface AssessmentResult {
  security: SecurityIssue[];
  quality: QualityIssue[];
  architecture: ArchitectureIssue[];
  scores: {
    security: number;
    quality: number;
    architecture: number;
  };
}

interface ImpactAnalysis {
  changeRequest: ChangeRequest;
  affectedNodes: Node[];
  affectedFiles: string[];
  breakingChanges: BreakingChange[];
  recommendations: Recommendation[];
}
```

## Technology Stack Recommendations

### Core Language
- **TypeScript/Node.js** (recommended)
  - Strong typing for complex data structures
  - Rich ecosystem for parsers and tools
  - Good performance
  - Easy to extend

- **Python** (alternative)
  - Excellent for NLP/AI features (future)
  - Good library ecosystem
  - Slower performance for large repos

### Key Libraries

**Parsing**:
- Tree-sitter (multi-language parser)
- Babel (@babel/parser for JavaScript)
- TypeScript compiler API
- Python AST module (for Python)

**Graph Processing**:
- graphlib (Dagre for layouts)
- NetworkX (if using Python)

**Visualization**:
- D3.js
- Cytoscape.js
- vis.js

**Security/Quality**:
- ESLint + security plugins
- Semgrep
- Bandit (Python)
- npm audit

**Database** (for storing results):
- PostgreSQL (recommended)
- SQLite (for MVP/simple storage)

## Workflow

### Analysis Workflow

```
1. User provides GitHub repo ID
   ↓
2. GitHub Integration: Clone repository
   ↓
3. Tech Stack Detection: Identify technologies
   ↓
4. Parallel Analysis:
   - Frontend Analyzer: Parse frontend files
   - Backend Analyzer: Parse backend files
   - Database Analyzer: Extract schema
   ↓
5. Lineage Graph Builder: Connect all layers
   ↓
6. Assessment Engine: Run security/quality checks
   ↓
7. Generate Reports:
   - Assessment report
   - Lineage visualization
   - Documentation
   ↓
8. Return results to user
```

### Impact Analysis Workflow

```
1. User provides change request
   ↓
2. Parse change request: Identify affected components
   ↓
3. Impact Analysis Engine:
   - Traverse dependency graph
   - Find affected nodes
   - Detect breaking changes
   ↓
4. Generate Impact Report:
   - List affected files
   - Show dependency chain
   - Suggest code changes
   ↓
5. Return impact analysis
```

## Scalability Considerations

### Performance Optimization
- **Caching**: Cache parsed ASTs, detection results
- **Parallel Processing**: Analyze files in parallel
- **Incremental Analysis**: Only re-analyze changed files
- **Lazy Loading**: Load graph visualization on demand

### Large Repository Handling
- **File Filtering**: Skip irrelevant files (node_modules, build artifacts)
- **Chunked Processing**: Process large repos in chunks
- **Memory Management**: Stream large files instead of loading entirely
- **Progress Tracking**: Show progress for long-running analyses

### Accuracy Improvement
- **Confidence Scoring**: All connections have confidence scores
- **User Feedback**: Allow users to correct false positives/negatives
- **Learning System**: Improve patterns based on feedback (future)
- **Manual Overrides**: Allow users to manually add/remove connections

## Extension Points

### Plugin Architecture
- **Parser Plugins**: Add support for new languages
- **Framework Plugins**: Add detection for new frameworks
- **Rule Plugins**: Custom assessment rules
- **Visualization Plugins**: Custom visualization layouts

### Integration Points
- **CI/CD Integration**: GitHub Actions, GitLab CI
- **IDE Plugins**: VS Code extension
- **API**: RESTful API for programmatic access
- **Webhooks**: Real-time updates on repo changes

