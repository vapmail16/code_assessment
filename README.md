# Code Assessment & Lineage Platform

A comprehensive platform for analyzing GitHub repositories, assessing code quality and security, building full-stack lineage graphs, and performing change impact analysis.

## Features

### 🎯 Core Capabilities

1. **Repository Analysis**
   - GitHub repository cloning and analysis
   - File tree parsing and structure detection
   - Config file detection (package.json, requirements.txt, etc.)
   - Entry point identification

2. **Tech Stack Detection**
   - Automatic framework detection (React, Vue, Angular, Express, FastAPI, etc.)
   - Database detection (PostgreSQL, MySQL, MongoDB, etc.)
   - Build tool detection (Webpack, Vite, CRA, etc.)
   - Testing framework detection
   - Confidence scoring for detections

3. **Code Analysis**
   - **Frontend**: React component detection, API call extraction, dependency graph building
   - **Backend**: Route extraction (Express, FastAPI, Flask), query detection (Sequelize, TypeORM, Prisma), service layer detection
   - **Database**: Schema extraction from migrations/models, relationship mapping, usage tracking

4. **Lineage Graph Building**
   - Full-stack dependency mapping (Frontend → Backend → Database)
   - Cross-layer connection logic
   - Confidence-based matching
   - Graph export formats (JSON, GraphML, Cytoscape)

5. **Code Assessment**
   - Security scanning (SQL injection, XSS, sensitive data exposure)
   - Code quality checks (complexity, duplication, performance issues)
   - Architecture pattern detection (MVC, layered architecture)
   - Anti-pattern detection (circular dependencies, god objects, tight coupling)

6. **Change Impact Analysis**
   - Natural language change request parsing
   - Affected file/node identification
   - Breaking change detection
   - Impact estimation (complexity, time)
   - Recommendations generation

7. **Visualization**
   - Multiple layout algorithms (hierarchical, force-directed, circular, grid)
   - Layer-based styling
   - Export to visualization tools (vis.js, D3.js, Cytoscape.js, yEd, Gephi)

## Installation

```bash
npm install
```

## Usage

### CLI

```bash
# Analyze a repository
npm run cli analyze -r owner/repo --token YOUR_GITHUB_TOKEN

# Analyze change impact
npm run cli impact -r owner/repo -c "Modify /api/users endpoint" --token YOUR_GITHUB_TOKEN

# Export graph
npm run cli export -f json -o lineage.json
```

### API Server

```bash
# Start API server
npm run api

# Endpoints:
# GET  /health
# POST /api/analyze - Analyze repository
# POST /api/impact - Analyze change impact
# POST /api/export - Export graph
```

### Programmatic Usage

```typescript
import { GitHubService } from '@code-assessment/github';
import { TechStackDetector } from '@code-assessment/detection';
import { buildLineageGraph } from '@code-assessment/lineage';
import { runAssessment } from '@code-assessment/assessment';
import { analyzeChangeImpact } from '@code-assessment/impact';

// Clone and analyze repository
const githubService = new GitHubService({ token: 'YOUR_TOKEN' });
const analysis = await githubService.cloneAndAnalyzeRepository('owner/repo');

// Detect tech stack
const detector = new TechStackDetector();
const techStack = detector.detectTechStack({
  fileTree: analysis.fileTree,
  configFiles: analysis.configFiles,
  entryPoints: analysis.entryPoints,
});

// Run code assessment
const assessment = await runAssessment({
  repoPath: analysis.localPath,
  fileTree: analysis.fileTree,
  parsedFiles: [],
  dependencyGraph: undefined,
  lineageGraph: undefined,
});

// Analyze change impact
const impact = analyzeChangeImpact({
  changeRequest: { id: '1', type: 'modify-api', description: 'Change endpoint' },
  lineageGraph: graph,
  endpoints: [],
  queries: [],
  components: [],
});
```

## Architecture

```
src/
├── github/          # GitHub integration (API, cloning, file analysis)
├── detection/       # Tech stack detection engine
├── analyzers/       # Code analyzers
│   ├── frontend/    # React, Vue, Angular analysis
│   ├── backend/     # Express, FastAPI, Flask analysis
│   └── database/    # Schema and query analysis
├── lineage/         # Graph building and connection logic
├── assessment/      # Security, quality, architecture assessment
├── impact/          # Change impact analysis
├── visualization/   # Graph export and layout algorithms
├── reporting/       # Report generation
├── cli/             # Command-line interface
└── api/             # REST API server
```

## Technology Stack

- **Language**: TypeScript
- **Runtime**: Node.js
- **Testing**: Jest
- **Build**: TypeScript Compiler
- **Linting**: ESLint
- **Formatting**: Prettier

## Development

```bash
# Build
npm run build

# Test
npm test

# Lint
npm run lint

# Format
npm run format
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT

## Documentation

See `docs/` directory for detailed documentation:
- `01_product_overview.md` - Product vision and capabilities
- `02_feasibility_analysis.md` - Technical feasibility and estimates
- `03_implementation_plan.md` - Detailed implementation plan
- `04_architecture_design.md` - System architecture
- `05_section1_detailed_steps.md` - Implementation details
