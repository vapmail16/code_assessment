# User Guide

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- GitHub Personal Access Token (for repository analysis)

### Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Set GitHub token (optional):
   ```bash
   export GITHUB_TOKEN=your_token_here
   ```

## Basic Usage

### 1. Analyze a Repository

```bash
npm run cli analyze -r owner/repo --token YOUR_TOKEN
```

This will:
- Clone the repository
- Analyze file structure
- Detect tech stack
- Generate assessment report

### 2. Analyze Change Impact

```bash
npm run cli impact -r owner/repo -c "Modify /api/users endpoint to add pagination"
```

### 3. Export Lineage Graph

```bash
npm run cli export -f json -o lineage.json
```

## API Usage

### Start Server

```bash
npm run api
```

### Analyze Repository

```bash
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "repo": "owner/repo",
    "token": "YOUR_TOKEN"
  }'
```

### Analyze Change Impact

```bash
curl -X POST http://localhost:3000/api/impact \
  -H "Content-Type: application/json" \
  -d '{
    "change": "Modify /api/users endpoint",
    "lineageGraph": {...}
  }'
```

## Understanding Results

### Tech Stack Detection

The platform detects:
- Frontend frameworks (React, Vue, Angular)
- Backend frameworks (Express, FastAPI, Flask)
- Databases (PostgreSQL, MySQL, MongoDB)
- Build tools (Webpack, Vite)
- Testing frameworks

### Assessment Scores

- **Security Score** (0-100): Based on vulnerability detection
- **Quality Score** (0-100): Based on code quality metrics
- **Architecture Score** (0-100): Based on pattern compliance

### Lineage Graph

The graph shows:
- **Nodes**: Components, endpoints, queries, tables
- **Edges**: API calls, database queries, dependencies
- **Layers**: Frontend, Backend, Database

### Impact Analysis

Results include:
- Affected files and nodes
- Breaking changes detected
- Estimated complexity and time
- Recommendations

## Advanced Features

### Custom Detection Rules

Extend detection by modifying `src/detection/rules.ts`

### Custom Assessment Rules

Add assessment rules in `src/assessment/`

### Visualization

Export graphs in multiple formats:
- JSON (vis.js, D3.js)
- GraphML (yEd, Gephi)
- Cytoscape.js format

## Troubleshooting

### GitHub Rate Limits

Use a GitHub Personal Access Token to increase rate limits.

### Large Repositories

Large repositories may take longer to analyze. Consider:
- Using shallow clones
- Analyzing specific branches
- Filtering file types

### Memory Issues

For very large repositories, increase Node.js memory:
```bash
node --max-old-space-size=4096 dist/cli/index.js analyze ...
```

