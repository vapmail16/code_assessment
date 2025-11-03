/**
 * Detection rules for tech stack identification
 */

export interface DetectionRule {
  name: string;
  type: 'package-file' | 'import' | 'config-file' | 'file-extension' | 'pattern' | 'file-content';
  pattern: string | RegExp;
  confidence: number; // 0-1
  framework?: string;
  metadata?: Record<string, any>;
}

/**
 * Package file detection rules
 */
export const PACKAGE_FILE_RULES: DetectionRule[] = [
  {
    name: 'Node.js - package.json',
    type: 'package-file',
    pattern: 'package.json',
    confidence: 1.0,
    framework: 'nodejs',
  },
  {
    name: 'Python - requirements.txt',
    type: 'package-file',
    pattern: 'requirements.txt',
    confidence: 0.9,
    framework: 'python',
  },
  {
    name: 'Python - Pipfile',
    type: 'package-file',
    pattern: 'Pipfile',
    confidence: 0.95,
    framework: 'python',
  },
  {
    name: 'Python - pyproject.toml',
    type: 'package-file',
    pattern: 'pyproject.toml',
    confidence: 0.9,
    framework: 'python',
  },
  {
    name: 'Go - go.mod',
    type: 'package-file',
    pattern: 'go.mod',
    confidence: 1.0,
    framework: 'go',
  },
  {
    name: 'Rust - Cargo.toml',
    type: 'package-file',
    pattern: 'Cargo.toml',
    confidence: 1.0,
    framework: 'rust',
  },
  {
    name: 'Java - pom.xml',
    type: 'package-file',
    pattern: 'pom.xml',
    confidence: 1.0,
    framework: 'java',
  },
  {
    name: 'Java - build.gradle',
    type: 'package-file',
    pattern: 'build.gradle',
    confidence: 0.95,
    framework: 'java',
  },
];

/**
 * Frontend framework detection rules (package.json dependencies)
 */
export const FRONTEND_FRAMEWORK_RULES: DetectionRule[] = [
  {
    name: 'React',
    type: 'pattern',
    pattern: /^react$/i,
    confidence: 0.95,
    framework: 'react',
  },
  {
    name: 'React DOM',
    type: 'pattern',
    pattern: /^react-dom$/i,
    confidence: 0.9,
    framework: 'react',
  },
  {
    name: 'Vue.js',
    type: 'pattern',
    pattern: /^vue$/i,
    confidence: 0.95,
    framework: 'vue',
  },
  {
    name: 'Angular',
    type: 'pattern',
    pattern: /^@angular\/core$/i,
    confidence: 1.0,
    framework: 'angular',
  },
  {
    name: 'Svelte',
    type: 'pattern',
    pattern: /^svelte$/i,
    confidence: 0.95,
    framework: 'svelte',
  },
  {
    name: 'Next.js',
    type: 'pattern',
    pattern: /^next$/i,
    confidence: 1.0,
    framework: 'nextjs',
  },
  {
    name: 'Nuxt.js',
    type: 'pattern',
    pattern: /^nuxt$/i,
    confidence: 1.0,
    framework: 'nuxtjs',
  },
];

/**
 * Backend framework detection rules
 */
export const BACKEND_FRAMEWORK_RULES: DetectionRule[] = [
  // Node.js frameworks
  {
    name: 'Express',
    type: 'pattern',
    pattern: /^express$/i,
    confidence: 0.95,
    framework: 'express',
  },
  {
    name: 'Fastify',
    type: 'pattern',
    pattern: /^fastify$/i,
    confidence: 0.95,
    framework: 'fastify',
  },
  {
    name: 'Koa',
    type: 'pattern',
    pattern: /^koa$/i,
    confidence: 0.95,
    framework: 'koa',
  },
  {
    name: 'NestJS',
    type: 'pattern',
    pattern: /^@nestjs\/core$/i,
    confidence: 1.0,
    framework: 'nestjs',
  },
  // Python frameworks
  {
    name: 'FastAPI',
    type: 'pattern',
    pattern: /^fastapi$/i,
    confidence: 0.95,
    framework: 'fastapi',
  },
  {
    name: 'Flask',
    type: 'pattern',
    pattern: /^flask$/i,
    confidence: 0.95,
    framework: 'flask',
  },
  {
    name: 'Django',
    type: 'pattern',
    pattern: /^django$/i,
    confidence: 0.95,
    framework: 'django',
  },
  {
    name: 'Tornado',
    type: 'pattern',
    pattern: /^tornado$/i,
    confidence: 0.9,
    framework: 'tornado',
  },
];

/**
 * Database detection rules
 */
export const DATABASE_RULES: DetectionRule[] = [
  // Database drivers/ORMs
  {
    name: 'PostgreSQL - pg',
    type: 'pattern',
    pattern: /^pg$/i,
    confidence: 0.9,
    framework: 'postgresql',
  },
  {
    name: 'PostgreSQL - node-postgres',
    type: 'pattern',
    pattern: /^pg$/i,
    confidence: 0.85,
    framework: 'postgresql',
  },
  {
    name: 'MySQL - mysql2',
    type: 'pattern',
    pattern: /^mysql2$/i,
    confidence: 0.9,
    framework: 'mysql',
  },
  {
    name: 'MySQL - mysql',
    type: 'pattern',
    pattern: /^mysql$/i,
    confidence: 0.85,
    framework: 'mysql',
  },
  {
    name: 'MongoDB - mongodb',
    type: 'pattern',
    pattern: /^mongodb$/i,
    confidence: 0.9,
    framework: 'mongodb',
  },
  {
    name: 'MongoDB - mongoose',
    type: 'pattern',
    pattern: /^mongoose$/i,
    confidence: 0.95,
    framework: 'mongodb',
  },
  {
    name: 'SQLite - sqlite3',
    type: 'pattern',
    pattern: /^sqlite3$/i,
    confidence: 0.95,
    framework: 'sqlite',
  },
  {
    name: 'Redis - redis',
    type: 'pattern',
    pattern: /^redis$/i,
    confidence: 0.9,
    framework: 'redis',
  },
  // ORMs
  {
    name: 'Sequelize',
    type: 'pattern',
    pattern: /^sequelize$/i,
    confidence: 0.9,
    framework: 'sequelize',
  },
  {
    name: 'TypeORM',
    type: 'pattern',
    pattern: /^typeorm$/i,
    confidence: 0.95,
    framework: 'typeorm',
  },
  {
    name: 'Prisma',
    type: 'pattern',
    pattern: /^@prisma\/client$/i,
    confidence: 1.0,
    framework: 'prisma',
  },
  {
    name: 'SQLAlchemy',
    type: 'pattern',
    pattern: /^sqlalchemy$/i,
    confidence: 0.95,
    framework: 'sqlalchemy',
  },
  {
    name: 'Django ORM',
    type: 'pattern',
    pattern: /^django$/i,
    confidence: 0.8,
    framework: 'django-orm',
  },
];

/**
 * Build tool detection rules
 */
export const BUILD_TOOL_RULES: DetectionRule[] = [
  {
    name: 'Webpack',
    type: 'pattern',
    pattern: /^webpack$/i,
    confidence: 0.95,
    framework: 'webpack',
  },
  {
    name: 'Vite',
    type: 'pattern',
    pattern: /^vite$/i,
    confidence: 1.0,
    framework: 'vite',
  },
  {
    name: 'Rollup',
    type: 'pattern',
    pattern: /^rollup$/i,
    confidence: 0.95,
    framework: 'rollup',
  },
  {
    name: 'Parcel',
    type: 'pattern',
    pattern: /^parcel$/i,
    confidence: 0.95,
    framework: 'parcel',
  },
  {
    name: 'Create React App',
    type: 'pattern',
    pattern: /^react-scripts$/i,
    confidence: 0.9,
    framework: 'cra',
  },
];

/**
 * Testing framework detection rules
 */
export const TESTING_RULES: DetectionRule[] = [
  {
    name: 'Jest',
    type: 'pattern',
    pattern: /^jest$/i,
    confidence: 1.0,
    framework: 'jest',
  },
  {
    name: 'Mocha',
    type: 'pattern',
    pattern: /^mocha$/i,
    confidence: 0.95,
    framework: 'mocha',
  },
  {
    name: 'Vitest',
    type: 'pattern',
    pattern: /^vitest$/i,
    confidence: 1.0,
    framework: 'vitest',
  },
  {
    name: 'Cypress',
    type: 'pattern',
    pattern: /^cypress$/i,
    confidence: 1.0,
    framework: 'cypress',
  },
  {
    name: 'Playwright',
    type: 'pattern',
    pattern: /^@playwright\/test$/i,
    confidence: 1.0,
    framework: 'playwright',
  },
  {
    name: 'Pytest',
    type: 'pattern',
    pattern: /^pytest$/i,
    confidence: 0.95,
    framework: 'pytest',
  },
  {
    name: 'JUnit',
    type: 'pattern',
    pattern: /^junit$/i,
    confidence: 0.9,
    framework: 'junit',
  },
];

/**
 * Config file detection rules
 */
export const CONFIG_FILE_RULES: DetectionRule[] = [
  {
    name: 'Angular - angular.json',
    type: 'config-file',
    pattern: 'angular.json',
    confidence: 1.0,
    framework: 'angular',
  },
  {
    name: 'Next.js - next.config.js',
    type: 'config-file',
    pattern: 'next.config.js',
    confidence: 1.0,
    framework: 'nextjs',
  },
  {
    name: 'Nuxt.js - nuxt.config.js',
    type: 'config-file',
    pattern: 'nuxt.config.js',
    confidence: 1.0,
    framework: 'nuxtjs',
  },
  {
    name: 'Vite - vite.config.js',
    type: 'config-file',
    pattern: 'vite.config.js',
    confidence: 1.0,
    framework: 'vite',
  },
  {
    name: 'TypeScript - tsconfig.json',
    type: 'config-file',
    pattern: 'tsconfig.json',
    confidence: 0.9,
    framework: 'typescript',
  },
];

/**
 * File extension detection rules
 */
export const FILE_EXTENSION_RULES: DetectionRule[] = [
  {
    name: 'React - JSX',
    type: 'file-extension',
    pattern: '.jsx',
    confidence: 0.7,
    framework: 'react',
  },
  {
    name: 'React - TSX',
    type: 'file-extension',
    pattern: '.tsx',
    confidence: 0.75,
    framework: 'react',
  },
  {
    name: 'Vue - .vue',
    type: 'file-extension',
    pattern: '.vue',
    confidence: 0.95,
    framework: 'vue',
  },
  {
    name: 'TypeScript',
    type: 'file-extension',
    pattern: '.ts',
    confidence: 0.8,
    framework: 'typescript',
  },
];

/**
 * All detection rules combined
 */
export const ALL_RULES: DetectionRule[] = [
  ...PACKAGE_FILE_RULES,
  ...FRONTEND_FRAMEWORK_RULES,
  ...BACKEND_FRAMEWORK_RULES,
  ...DATABASE_RULES,
  ...BUILD_TOOL_RULES,
  ...TESTING_RULES,
  ...CONFIG_FILE_RULES,
  ...FILE_EXTENSION_RULES,
];

