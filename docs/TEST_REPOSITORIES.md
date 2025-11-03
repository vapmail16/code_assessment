# Test Repositories for Accuracy Validation

This document describes the test repositories used for accuracy validation and how to set them up.

## Overview

We need test repositories with **known lineage structures** to validate the accuracy of our code assessment platform. Each repository should have a clear, documented connection path from frontend → backend → database.

## Required Test Repositories

### 1. React + Express + PostgreSQL - User Management App

**Repository Structure**:
```
react-express-user-app/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── UserProfile.tsx (calls GET /api/users/:id)
│   │   │   ├── UserList.tsx (calls GET /api/users)
│   │   │   └── CreateUser.tsx (calls POST /api/users)
│   └── package.json
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   │   └── users.ts (defines GET /api/users/:id, POST /api/users)
│   │   └── services/
│   │       └── userService.ts (queries users table)
│   └── package.json
└── database/
    └── migrations/
        └── 001_create_users.sql
```

**Expected Connections**:
- `UserProfile` component → `GET /api/users/:id` endpoint
- `GET /api/users/:id` → `userService.findById()` → `users` table
- `UserList` component → `GET /api/users` endpoint
- `GET /api/users` → `userService.findAll()` → `users` table

**Setup Instructions**:
```bash
# Create repository
mkdir react-express-user-app
cd react-express-user-app

# Initialize frontend
npx create-react-app frontend --template typescript
cd frontend
npm install axios

# Initialize backend
cd ..
mkdir backend
cd backend
npm init -y
npm install express cors pg
npm install -D @types/express @types/cors @types/pg typescript ts-node

# Add database schema
mkdir -p database/migrations
# Create migration file with users table
```

---

### 2. Vue.js + FastAPI + MongoDB - E-commerce App

**Repository Structure**:
```
vue-fastapi-ecommerce/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ProductList.vue (calls GET /api/products)
│   │   │   └── Cart.vue (calls POST /api/cart/add)
│   └── package.json
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── cart.py (defines POST /api/cart/add)
│   │   └── models/
│   │       └── product.py (MongoDB model)
│   └── requirements.txt
└── docker-compose.yml
```

**Expected Connections**:
- `ProductList` → `GET /api/products` → MongoDB `products` collection
- `Cart` → `POST /api/cart/add` → MongoDB `cart` collection

---

### 3. React + Next.js + GraphQL + Prisma

**Repository Structure**:
```
react-nextjs-graphql-app/
├── prisma/
│   └── schema.prisma (Post model)
├── src/
│   ├── components/
│   │   └── BlogPost.tsx (GraphQL query)
│   ├── graphql/
│   │   ├── schemas/
│   │   │   └── post.ts (GraphQL schema)
│   │   └── queries/
│   │       └── posts.ts (posts query)
│   └── pages/
│       └── api/
│           └── graphql.ts
└── package.json
```

**Expected Connections**:
- `BlogPost` component → GraphQL query → Prisma client → `Post` table

---

### 4. Angular + NestJS + PostgreSQL - Authentication App

**Repository Structure**:
```
angular-nestjs-auth/
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   └── components/
│   │   │       └── login/
│   │   │           └── login.component.ts (calls POST /api/auth/login)
│   └── package.json
├── backend/
│   ├── src/
│   │   ├── auth/
│   │   │   ├── auth.controller.ts (POST /api/auth/login)
│   │   │   └── auth.service.ts (queries users and sessions tables)
│   │   └── database/
│   │       └── entities/
│   │           ├── user.entity.ts
│   │           └── session.entity.ts
│   └── package.json
└── database/
    └── migrations/
```

**Expected Connections**:
- `LoginComponent` → `POST /api/auth/login` → `authService.login()` → `users` and `sessions` tables

---

## Creating Test Repositories

### Option 1: Create Minimal Test Repositories

Create simple repositories that demonstrate the connection patterns:

```bash
# Example: Simple React + Express setup
mkdir test-repo-1
cd test-repo-1

# Frontend
npx create-react-app frontend --template typescript
cd frontend/src
# Create component that calls API

# Backend
cd ../../backend
npm init -y
npm install express
# Create route that queries database

# Database
mkdir ../database
# Add SQL schema
```

### Option 2: Use Existing Sample Repositories

Fork or reference existing repositories with known structures:

1. **React + Express examples**:
   - Search GitHub for "react express postgresql starter"
   - Fork repositories with clear structure

2. **Vue + FastAPI examples**:
   - Search for "vue fastapi mongodb example"

### Option 3: Create Synthetic Test Cases

Use our test case definitions with mock data:

```typescript
// In test runner, create synthetic graphs for testing
const syntheticGraph = createSyntheticLineageGraph(testCase);
```

---

## Validation Testing Process

1. **Clone Test Repositories**:
```bash
# Use our GitHub service to clone test repos
node -e "
const { GitHubService } = require('./dist/github/service');
const service = new GitHubService({ token: process.env.GITHUB_TOKEN });
service.cloneAndAnalyzeRepository('owner/test-repo-1');
"
```

2. **Run Validation**:
```bash
npm run validate:accuracy -- --repos owner/test-repo-1,owner/test-repo-2
```

3. **Compare Results**:
- Compare detected connections vs expected connections
- Calculate accuracy metrics
- Generate validation report

---

## Test Repository Checklist

Each test repository should have:

- [ ] Clear documentation of expected lineage
- [ ] Simple, focused functionality (easier to validate)
- [ ] Consistent naming conventions
- [ ] Well-structured code (components, routes, services)
- [ ] Database schema with clear table relationships
- [ ] README explaining the architecture
- [ ] Known API endpoints and their database queries

---

## Current Status

- ✅ Test case definitions created (`src/validation/test-cases.ts`)
- ✅ Test runner implemented (`src/validation/test-runner.ts`)
- ⚠️ Actual test repositories need to be created/forked
- ⚠️ Test repositories should be public or accessible via token

---

## Next Steps

1. **Create or identify 5 test repositories** matching the test cases
2. **Document the expected lineage** for each repository
3. **Run validation tests** against these repositories
4. **Measure accuracy** and adjust algorithms if needed
5. **Repeat** until accuracy >80% target is met

---

## Alternative: Use Synthetic Test Data

If creating real repositories is not feasible, we can:

1. Generate synthetic AST structures matching test cases
2. Create mock lineage graphs
3. Validate our algorithms against known synthetic structures
4. Use these for unit testing and algorithm validation

This approach is faster but may not catch all real-world edge cases.

