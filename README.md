# Code Assessment & Lineage Platform

A comprehensive platform for assessing code quality, security, and best practices while mapping full-stack lineage from frontend to database.

## Features

- 🔍 **Code Assessment**: Security scanning, quality checks, architecture pattern detection
- 🔗 **Full-Stack Lineage**: Map connections from frontend → backend → database
- 📊 **Impact Analysis**: Understand what code changes affect when modifying features
- 🧪 **Test Coverage Mapping**: Identify which tests need updates for code changes
- ⚡ **Performance Benchmarks**: Measure analysis performance
- ✅ **Accuracy Validation**: Validate lineage accuracy with test cases
- 🔒 **Security Scanning**: Integrates ESLint, npm audit, Semgrep
- 📝 **Comprehensive Reports**: Generate detailed assessment reports

## Quick Start

### Installation

```bash
npm install
```

### Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
# Edit .env with your GitHub token
```

### Usage

**CLI**:
```bash
# Analyze repository
npm run cli analyze -r owner/repo

# Run assessment only
npm run cli assess -r owner/repo

# Generate lineage graph
npm run cli lineage -r owner/repo

# Impact analysis
npm run cli impact -r owner/repo -c "Modify user endpoint"

# Run validation tests
npm run validate:accuracy
```

**API Server**:
```bash
npm start
# API available at http://localhost:3000
```

**Docker**:
```bash
docker-compose up -d
```

## Documentation

- [User Guide](docs/USER_GUIDE.md)
- [API Documentation](docs/API_DOCUMENTATION.md)
- [Deployment Guide](docs/DEPLOYMENT_GUIDE.md)
- [Test Repositories Setup](docs/TEST_REPOSITORIES.md)
- [Architecture Design](docs/04_architecture_design.md)
- [Implementation Plan](docs/03_implementation_plan.md)

## Project Structure

```
code_assessment/
├── src/
│   ├── github/          # GitHub integration
│   ├── detection/       # Tech stack detection
│   ├── analyzers/       # Code analyzers (frontend, backend, database)
│   ├── lineage/         # Lineage graph building
│   ├── assessment/      # Security, quality, architecture assessment
│   ├── impact/          # Change impact analysis
│   ├── validation/      # Accuracy validation
│   ├── reporting/        # Report generation
│   ├── visualization/   # Graph export formats
│   ├── cli/             # CLI commands
│   └── api/             # REST API server
├── tests/               # Test files
├── docs/                # Documentation
├── Dockerfile           # Docker image
├── docker-compose.yml   # Docker Compose setup
└── package.json
```

## Supported Tech Stacks

**Frontend**:
- React (JSX/TSX)
- Vue.js
- Angular
- Next.js

**Backend**:
- Node.js (Express, Fastify, Koa)
- Python (FastAPI, Flask, Django)
- NestJS

**Databases**:
- PostgreSQL
- MySQL
- MongoDB

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Lint
npm run lint

# Format code
npm run format
```

## CI/CD

GitHub Actions workflows:
- **CI Pipeline**: Lint, test, build on every push/PR
- **Docker Build**: Build and push Docker images
- **Security Scan**: Vulnerability scanning
- **Accuracy Validation**: Daily validation tests

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

MIT

## Status

**MVP Status**: ~98% Complete ✅

All core features implemented:
- ✅ GitHub integration
- ✅ Tech stack detection
- ✅ Code analysis (frontend, backend, database)
- ✅ Lineage graph building
- ✅ Security & quality assessment
- ✅ Impact analysis
- ✅ Test coverage mapping
- ✅ Performance benchmarks
- ✅ Accuracy validation framework
- ✅ CLI and API interfaces
- ✅ Docker deployment
- ✅ CI/CD pipeline

**Production Ready**: Yes, with proper infrastructure setup.

## Support

For issues, questions, or contributions, please open an issue on GitHub.
