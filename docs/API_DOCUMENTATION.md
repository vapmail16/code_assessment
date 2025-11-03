# Code Assessment Platform - API Documentation

**Version**: 1.0.0  
**Base URL**: `http://localhost:3000`

---

## Table of Contents

1. [Authentication](#authentication)
2. [Endpoints](#endpoints)
3. [Error Handling](#error-handling)
4. [Rate Limiting](#rate-limiting)
5. [Request/Response Examples](#requestresponse-examples)

---

## Authentication

Currently, the API does not require authentication. GitHub Personal Access Tokens can be provided per-request for accessing private repositories.

**Future**: API key authentication will be added in a future release.

---

## Endpoints

### Health Check

Check API server status.

**Endpoint**: `GET /health`

**Response**:
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

### Analyze Repository

Analyze a GitHub repository for code assessment and lineage.

**Endpoint**: `POST /api/analyze`

**Request Body**:
```json
{
  "repository": "owner/repo",
  "options": {
    "includeSecurity": true,
    "includeQuality": true,
    "includeArchitecture": true,
    "buildLineage": true
  }
}
```

**Response**:
```json
{
  "success": true,
  "repository": "owner/repo",
  "techStack": {
    "frontend": [{"name": "React", "version": "18.0.0"}],
    "backend": [{"name": "Express", "version": "4.18.0"}],
    "databases": [{"name": "PostgreSQL", "version": "15.0"}]
  },
  "assessment": {
    "security": {
      "score": 85,
      "issues": [],
      "vulnerabilities": []
    },
    "quality": {
      "score": 78,
      "issues": []
    },
    "architecture": {
      "score": 82,
      "issues": []
    }
  },
  "lineage": {
    "nodes": 150,
    "edges": 200
  }
}
```

**Status Codes**:
- `200 OK`: Analysis completed successfully
- `400 Bad Request`: Invalid request body
- `404 Not Found`: Repository not found
- `500 Internal Server Error`: Analysis failed

---

### Impact Analysis

Analyze the impact of a proposed change on a repository.

**Endpoint**: `POST /api/impact`

**Request Body**:
```json
{
  "repository": "owner/repo",
  "changeRequest": {
    "type": "modify-api",
    "description": "Modify GET /api/users endpoint to return additional fields"
  }
}
```

**Response**:
```json
{
  "success": true,
  "repository": "owner/repo",
  "changeRequest": {
    "id": "change-123",
    "type": "modify-api",
    "description": "Modify GET /api/users endpoint"
  },
  "affectedFiles": [
    "src/routes/users.ts",
    "src/services/userService.ts"
  ],
  "affectedNodes": [],
  "breakingChanges": [],
  "recommendations": [
    {
      "id": "rec-1",
      "priority": "high",
      "type": "test-update",
      "title": "Update Affected Tests",
      "description": "2 test file(s) may need updates",
      "affectedFiles": ["tests/users.test.ts"]
    }
  ],
  "summary": {
    "totalAffectedFiles": 2,
    "totalAffectedNodes": 5,
    "criticalImpact": 0,
    "highImpact": 1,
    "mediumImpact": 1,
    "lowImpact": 0,
    "breakingChangesCount": 0,
    "estimatedComplexity": "medium"
  }
}
```

**Status Codes**:
- `200 OK`: Impact analysis completed
- `400 Bad Request`: Invalid change request
- `500 Internal Server Error`: Analysis failed

---

### Export Lineage Graph

Export lineage graph in various formats for visualization.

**Endpoint**: `POST /api/export`

**Request Body**:
```json
{
  "graph": {
    "nodes": [...],
    "edges": [...]
  },
  "format": "json"
}
```

**Supported Formats**:
- `json`: JSON format (default)
- `graphml`: GraphML format for tools like yEd, Gephi
- `cytoscape`: Cytoscape.js format for web visualization

**Response** (JSON format):
```json
{
  "elements": {
    "nodes": [
      {
        "data": {
          "id": "component:UserProfile",
          "label": "UserProfile",
          "layer": "frontend",
          "type": "component"
        }
      }
    ],
    "edges": [
      {
        "data": {
          "id": "edge-1",
          "source": "component:UserProfile",
          "target": "endpoint:GET /api/users/:id",
          "type": "api-call"
        }
      }
    ]
  }
}
```

**Response** (GraphML format):
```xml
<?xml version="1.0" encoding="UTF-8"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns">
  <graph id="lineage" edgedefault="directed">
    <node id="component:UserProfile"/>
    <edge source="component:UserProfile" target="endpoint:GET /api/users/:id"/>
  </graph>
</graphml>
```

**Status Codes**:
- `200 OK`: Export successful
- `400 Bad Request`: Invalid graph or format
- `500 Internal Server Error`: Export failed

---

## Error Handling

All errors follow a consistent format:

```json
{
  "error": "Error message here",
  "code": "ERROR_CODE",
  "details": {}
}
```

**Common Error Codes**:
- `VALIDATION_ERROR`: Invalid request data (400)
- `GITHUB_ERROR`: GitHub API error (502)
- `ANALYSIS_ERROR`: Analysis execution error (500)
- `NOT_FOUND`: Resource not found (404)

**Example Error Response**:
```json
{
  "error": "Repository not found",
  "code": "NOT_FOUND",
  "details": {
    "repository": "invalid/repo"
  }
}
```

---

## Rate Limiting

The API implements rate limiting to prevent abuse:

- **Default**: 100 requests per 15 minutes per IP
- **Headers**: Rate limit information is included in response headers:
  - `X-RateLimit-Limit`: Maximum requests allowed
  - `X-RateLimit-Remaining`: Remaining requests
  - `X-RateLimit-Reset`: Time when limit resets (Unix timestamp)

**Rate Limit Exceeded Response**:
```json
{
  "error": "Too many requests from this IP, please try again later.",
  "code": "RATE_LIMIT_EXCEEDED"
}
```
Status Code: `429 Too Many Requests`

---

## Request/Response Examples

### cURL Examples

**Analyze Repository**:
```bash
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "repository": "owner/repo",
    "options": {
      "includeSecurity": true,
      "buildLineage": true
    }
  }'
```

**Impact Analysis**:
```bash
curl -X POST http://localhost:3000/api/impact \
  -H "Content-Type: application/json" \
  -d '{
    "repository": "owner/repo",
    "changeRequest": {
      "type": "modify-api",
      "description": "Add pagination to users endpoint"
    }
  }'
```

**Export Graph**:
```bash
curl -X POST http://localhost:3000/api/export \
  -H "Content-Type: application/json" \
  -d '{
    "graph": {...},
    "format": "cytoscape"
  }'
```

### JavaScript/TypeScript Example

```typescript
const response = await fetch('http://localhost:3000/api/analyze', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    repository: 'owner/repo',
    options: {
      includeSecurity: true,
      buildLineage: true,
    },
  }),
});

const data = await response.json();
console.log(data);
```

### Python Example

```python
import requests

response = requests.post(
    'http://localhost:3000/api/analyze',
    json={
        'repository': 'owner/repo',
        'options': {
            'includeSecurity': True,
            'buildLineage': True,
        }
    }
)

data = response.json()
print(data)
```

---

## Graph Data Structure

### Lineage Graph Format

```typescript
interface LineageGraph {
  nodes: LineageNode[];
  edges: LineageEdge[];
  layers: {
    frontend: string[];
    backend: string[];
    database: string[];
  };
  metadata: {
    totalNodes: number;
    totalEdges: number;
    confidence: {
      average: number;
      min: number;
      max: number;
    };
  };
}

interface LineageNode {
  id: string;
  type: 'component' | 'api-call' | 'endpoint' | 'database-query' | 'table';
  layer: 'frontend' | 'backend' | 'database';
  label: string;
  file?: string;
  line?: number;
  data?: Record<string, any>;
}

interface LineageEdge {
  id: string;
  from: string;
  to: string;
  type: 'api-call' | 'database-query' | 'import' | 'uses';
  label?: string;
  confidence?: number;
}
```

---

## Best Practices

1. **Error Handling**: Always check response status codes and handle errors appropriately
2. **Rate Limiting**: Monitor rate limit headers and implement retry logic with exponential backoff
3. **Large Repositories**: For large repositories, analysis may take several minutes. Implement polling or async processing
4. **Caching**: Cache analysis results when possible to avoid redundant analysis
5. **GitHub Tokens**: Use environment variables for GitHub tokens, never hardcode them

---

## Changelog

### Version 1.0.0 (2024-01-15)
- Initial API release
- Analyze repository endpoint
- Impact analysis endpoint
- Export lineage graph endpoint
- Rate limiting and error handling

---

## Support

For issues, questions, or feature requests, please open an issue on GitHub.

