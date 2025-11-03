# Code Assessment & Lineage Platform

A comprehensive tool for analyzing GitHub repositories to assess code quality, security, best practices, and visualize full-stack lineage from frontend to database.

## Features

- **Code Assessment**: Evaluate code quality, security vulnerabilities, and best practices
- **Full-Stack Lineage**: Visualize connections from frontend → middleware → backend → database
- **Change Impact Analysis**: Assess what code needs to change when given a modification request

## Project Status

🚧 **Phase 1: MVP Development** - Currently implementing Section 1 (Project Setup & Foundation)

## Technology Stack

- **Language**: TypeScript/Node.js
- **Package Manager**: npm
- **Testing**: Jest
- **Linting**: ESLint
- **Formatting**: Prettier
- **CI/CD**: GitHub Actions

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm 9+

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd code_assessment

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test
```

### Development

```bash
# Watch mode for development
npm run build:watch

# Run linter
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format
```

## Project Structure

```
code_assessment/
├── src/
│   ├── github/          # GitHub integration
│   ├── detection/        # Tech stack detection
│   ├── analyzers/        # Code analyzers (frontend, backend, database)
│   ├── lineage/          # Lineage graph builder
│   ├── impact/           # Impact analysis engine
│   ├── assessment/       # Assessment engine
│   ├── reporting/        # Report generation
│   ├── visualization/    # Graph visualization
│   ├── utils/           # Utility functions
│   └── types/           # TypeScript type definitions
├── config/              # Configuration files
├── tests/               # Test files
├── docs/                # Documentation
└── scripts/             # Build and utility scripts
```

## Documentation

See the [docs/](./docs/) directory for detailed documentation:

- [Product Overview](./docs/01_product_overview.md)
- [Feasibility Analysis](./docs/02_feasibility_analysis.md)
- [Implementation Plan](./docs/03_implementation_plan.md)
- [Architecture Design](./docs/04_architecture_design.md)
- [Section 1 Detailed Steps](./docs/05_section1_detailed_steps.md)

## Development Roadmap

### Phase 1: MVP (Current)
- [x] Project setup and foundation
- [ ] GitHub integration
- [ ] Tech stack detection
- [ ] Frontend analyzer
- [ ] Backend analyzer
- [ ] Database analyzer
- [ ] Lineage graph builder
- [ ] Basic assessment engine
- [ ] Impact analysis
- [ ] Visualization
- [ ] Reporting

### Phase 2: Production-Ready
- Enhanced accuracy
- More tech stack support
- Web UI
- Performance optimization

### Phase 3: Enterprise Features
- Real-time monitoring
- CI/CD integration
- Advanced visualization
- AI-powered recommendations

## Contributing

This project is in early development. Contributions and feedback are welcome!

## License

MIT

