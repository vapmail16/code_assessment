# Product Overview: Code Assessment & Lineage Platform

## Vision

Build a comprehensive tool that analyzes GitHub repositories to provide:
1. **Code Assessment**: Evaluate code quality, security, and best practices
2. **Full-Stack Lineage**: Visualize connections from frontend → middleware → backend → database
3. **Change Impact Analysis**: Assess what code needs to change when given a modification request

## Core Capabilities

### 1. Code Assessment Engine
- Static code analysis for coding standards
- Security vulnerability scanning
- Best practices compliance checking
- Performance anti-pattern detection
- Architecture pattern validation

### 2. Full-Stack Lineage Mapping
- Trace API/endpoint calls through the entire stack
- Database schema extraction and mapping
- Dependency graph building (AST analysis, import/export tracking)
- HTTP/GraphQL request flow visualization
- Interactive graphical representation

### 3. Change Impact Analysis
- Dependency graph traversal
- API contract analysis (identify consumers)
- Database schema change propagation
- Test coverage mapping
- Breaking change detection
- Automated assessment report generation (code changes + documentation)

## Technical Requirements

- **Multi-tech stack support**: Work with any technology stack
- **Scalable**: Handle repositories of various sizes
- **Accurate**: High precision in tracing and impact analysis
- **Actionable**: Provide clear, implementable recommendations

## Target Users

- Internal tooling (DevOps/platform teams)
- Code review platforms (GitHub/GitLab integrations)
- Architecture documentation (living docs)
- Onboarding tools (new team member understanding)
- Compliance/audit (change tracking, security posture)

## Success Metrics

- Accuracy in cross-layer tracing (>80%)
- False positive rate in impact analysis (<15%)
- Coverage of popular tech stacks (5-10 initially)
- Time to generate report (<5 minutes for medium repos)
- User adoption and feedback scores

