# Technology Stack

## Core Technologies

### Language & Runtime
- **Primary Language**: TypeScript
- **Runtime**: Node.js 18+
- **Package Manager**: npm

### Rationale
- TypeScript provides strong typing for complex data structures
- Rich ecosystem for parsing and analysis tools
- Good performance for large codebases
- Easy to extend and maintain

## Build & Development Tools

### Build System
- **Compiler**: TypeScript Compiler (tsc)
- **Target**: ES2020
- **Module System**: CommonJS

### Development Tools
- **Linting**: ESLint 9+ with TypeScript plugin
- **Formatting**: Prettier
- **Testing**: Jest with ts-jest
- **CI/CD**: GitHub Actions

## Database

### MVP Phase
- **Database**: SQLite
- **Library**: sqlite3
- **Rationale**: Simple setup, no external dependencies, sufficient for MVP

### Production Migration Path
- **Database**: PostgreSQL
- **Library**: pg
- **Migration Strategy**: SQLite → PostgreSQL converter utility

## Visualization (Future)

### MVP Phase
- **Library**: Cytoscape.js
- **Rationale**: Graph-focused, easier to implement, good layouts

### Phase 2 Considerations
- **Alternative**: D3.js (if more customization needed)
- **Alternative**: vis.js (for simpler needs)

## Key Dependencies (To Be Installed)

### Parsing & Analysis
- `@babel/parser` - JavaScript/TypeScript parsing
- `tree-sitter` - Multi-language parsing (future)
- `@typescript-eslint/parser` - TypeScript AST

### GitHub Integration
- `@octokit/rest` - GitHub API client
- `simple-git` - Git operations

### Visualization
- `cytoscape` - Graph visualization

### Testing & Quality
- `jest` - Testing framework
- `ts-jest` - TypeScript support for Jest
- `eslint` - Linting
- `prettier` - Code formatting

## Dependency Management Strategy

- Use npm for consistency
- Lock file (package-lock.json) committed to version control
- Regular dependency updates with security auditing
- Semantic versioning for releases

## Future Considerations

### Potential Additions
- **Python Integration**: If AI/ML features are needed (via subprocess or API)
- **Web Framework**: Express.js (if web UI is needed)
- **Database ORM**: Prisma or TypeORM (if complex queries are needed)
- **Cache**: Redis (if performance optimization is needed)

## Version Requirements

- Node.js: >= 18.0.0
- npm: >= 9.0.0
- TypeScript: >= 5.0.0

