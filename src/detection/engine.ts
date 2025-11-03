/**
 * Core tech stack detection engine
 */

import { TechStack, Framework, DetectionIndicator, Database, BuildTool, TestingTool } from '../types';
import { FileNode, FileTree } from '../types';
import * as path from 'path';
import {
  DetectionRule,
  ALL_RULES,
  FRONTEND_FRAMEWORK_RULES,
  BACKEND_FRAMEWORK_RULES,
  DATABASE_RULES,
  BUILD_TOOL_RULES,
  TESTING_RULES,
} from './rules';
import {
  analyzePackageJson,
  analyzeRequirementsTxt,
  analyzePipfile,
  analyzeGoMod,
} from './package-analyzer';
import { readFileContent } from '../utils/file-utils';

export interface DetectionContext {
  fileTree: FileTree;
  configFiles: Map<string, FileNode>;
  entryPoints: FileNode[];
}

export class TechStackDetector {
  /**
   * Detect tech stack from repository analysis
   */
  detectTechStack(context: DetectionContext): TechStack {
    const frameworks: Framework[] = [];
    const databases: Database[] = [];
    const buildTools: BuildTool[] = [];
    const testingTools: TestingTool[] = [];
    const indicators: DetectionIndicator[] = [];

    // Analyze package files
    const packageAnalysis = this.analyzePackageFiles(context.configFiles);

    // Detect frameworks from dependencies
    frameworks.push(...this.detectFrameworks(packageAnalysis, context));

    // Detect databases
    databases.push(...this.detectDatabases(packageAnalysis, context));

    // Detect build tools
    buildTools.push(...this.detectBuildTools(packageAnalysis, context));

    // Detect testing tools
    testingTools.push(...this.detectTestingTools(packageAnalysis, context));

    // Calculate overall confidence
    const overallConfidence = this.calculateOverallConfidence(frameworks);

    return {
      frontend: frameworks.filter((f) => f.type === 'frontend'),
      backend: frameworks.filter((f) => f.type === 'backend'),
      database: databases,
      buildTools,
      testing: testingTools,
      overallConfidence,
      detectedAt: new Date(),
    };
  }

  /**
   * Analyze package files
   */
  private analyzePackageFiles(
    configFiles: Map<string, FileNode>
  ): {
    nodejs: ReturnType<typeof analyzePackageJson> | null;
    python: {
      requirements: ReturnType<typeof analyzeRequirementsTxt>;
      pipfile: ReturnType<typeof analyzePipfile>;
    };
    go: ReturnType<typeof analyzeGoMod> | null;
    allIndicators: DetectionIndicator[];
  } {
    let nodejs: ReturnType<typeof analyzePackageJson> | null = null;
    const python: {
      requirements: ReturnType<typeof analyzeRequirementsTxt>;
      pipfile: ReturnType<typeof analyzePipfile>;
    } = {
      requirements: { packages: new Map<string, string>(), indicators: [] },
      pipfile: { packages: new Map<string, string>(), indicators: [] },
    };
    let go: ReturnType<typeof analyzeGoMod> | null = null;
    const allIndicators: DetectionIndicator[] = [];

    for (const [relativePath, fileNode] of configFiles) {
      const fileName = path.basename(fileNode.path);

      if (fileName === 'package.json') {
        nodejs = analyzePackageJson(fileNode.path);
        if (nodejs) {
          allIndicators.push(...nodejs.indicators);
        }
      } else if (fileName === 'requirements.txt') {
        python.requirements = analyzeRequirementsTxt(fileNode.path);
        allIndicators.push(...python.requirements.indicators);
      } else if (fileName === 'Pipfile') {
        python.pipfile = analyzePipfile(fileNode.path);
        allIndicators.push(...python.pipfile.indicators);
      } else if (fileName === 'go.mod') {
        go = analyzeGoMod(fileNode.path);
        if (go) {
          allIndicators.push(...go.indicators);
        }
      }
    }

    return { nodejs, python, go, allIndicators };
  }

  /**
   * Detect frameworks from package analysis and file structure
   */
  private detectFrameworks(
    packageAnalysis: ReturnType<typeof this.analyzePackageFiles>,
    context: DetectionContext
  ): Framework[] {
    const detected: Map<string, Framework> = new Map();

    // Detect from package.json dependencies
    if (packageAnalysis.nodejs?.allDependencies) {
      for (const rule of [...FRONTEND_FRAMEWORK_RULES, ...BACKEND_FRAMEWORK_RULES]) {
        for (const [depName] of packageAnalysis.nodejs.allDependencies) {
          if (this.matchesRule(depName, rule)) {
            const framework = this.createFramework(rule, packageAnalysis.allIndicators);
            this.updateFramework(detected, framework);
          }
        }
      }
    }

    // Detect from Python dependencies
    for (const [depName] of packageAnalysis.python.requirements.packages) {
      for (const rule of BACKEND_FRAMEWORK_RULES) {
        if (this.matchesRule(depName, rule)) {
          const framework = this.createFramework(rule, packageAnalysis.allIndicators);
          this.updateFramework(detected, framework);
        }
      }
    }

    // Detect from config files
    for (const [relativePath, fileNode] of context.configFiles) {
      const fileName = path.basename(fileNode.path);
      for (const rule of ALL_RULES) {
        if (rule.type === 'config-file' && rule.pattern === fileName) {
          const framework = this.createFramework(rule, packageAnalysis.allIndicators);
          framework.files.push(fileNode.relativePath);
          this.updateFramework(detected, framework);
        }
      }
    }

    // Detect from file extensions
    for (const [relativePath, fileNode] of context.fileTree.files) {
      if (fileNode.type === 'file' && fileNode.extension) {
        for (const rule of ALL_RULES) {
          if (rule.type === 'file-extension' && rule.pattern === fileNode.extension) {
            const framework = this.createFramework(rule, packageAnalysis.allIndicators);
            framework.files.push(fileNode.relativePath);
            this.updateFramework(detected, framework);
          }
        }
      }
    }

    return Array.from(detected.values());
  }

  /**
   * Detect databases
   */
  private detectDatabases(
    packageAnalysis: ReturnType<typeof this.analyzePackageFiles>,
    context: DetectionContext
  ): Database[] {
    const detected: Map<string, Database> = new Map();

    // Detect from Node.js dependencies
    if (packageAnalysis.nodejs?.allDependencies) {
      for (const rule of DATABASE_RULES) {
        for (const [depName] of packageAnalysis.nodejs.allDependencies) {
          if (this.matchesRule(depName, rule)) {
            const db = this.createDatabase(rule, depName);
            detected.set(db.name, db);
          }
        }
      }
    }

    // Detect from Python dependencies
    for (const [depName] of packageAnalysis.python.requirements.packages) {
      for (const rule of DATABASE_RULES) {
        if (this.matchesRule(depName, rule)) {
          const db = this.createDatabase(rule, depName);
          detected.set(db.name, db);
        }
      }
    }

    return Array.from(detected.values());
  }

  /**
   * Detect build tools
   */
  private detectBuildTools(
    packageAnalysis: ReturnType<typeof this.analyzePackageFiles>,
    context: DetectionContext
  ): BuildTool[] {
    const detected: Map<string, BuildTool> = new Map();

    if (packageAnalysis.nodejs?.allDependencies) {
      for (const rule of BUILD_TOOL_RULES) {
        for (const [depName] of packageAnalysis.nodejs.allDependencies) {
          if (this.matchesRule(depName, rule)) {
            const tool = this.createBuildTool(rule, context.configFiles);
            detected.set(tool.name, tool);
          }
        }
      }
    }

    return Array.from(detected.values());
  }

  /**
   * Detect testing tools
   */
  private detectTestingTools(
    packageAnalysis: ReturnType<typeof this.analyzePackageFiles>,
    context: DetectionContext
  ): TestingTool[] {
    const detected: Map<string, TestingTool> = new Map();

    if (packageAnalysis.nodejs?.allDependencies) {
      for (const rule of TESTING_RULES) {
        for (const [depName] of packageAnalysis.nodejs.allDependencies) {
          if (this.matchesRule(depName, rule)) {
            const tool = this.createTestingTool(rule, context.configFiles);
            detected.set(tool.name, tool);
          }
        }
      }
    }

    // Python testing tools
    for (const [depName] of packageAnalysis.python.requirements.packages) {
      for (const rule of TESTING_RULES) {
        if (this.matchesRule(depName, rule)) {
          const tool = this.createTestingTool(rule, context.configFiles);
          detected.set(tool.name, tool);
        }
      }
    }

    return Array.from(detected.values());
  }

  /**
   * Match dependency name against rule pattern
   */
  private matchesRule(depName: string, rule: DetectionRule): boolean {
    if (typeof rule.pattern === 'string') {
      return depName.toLowerCase() === rule.pattern.toLowerCase();
    } else if (rule.pattern instanceof RegExp) {
      return rule.pattern.test(depName);
    }
    return false;
  }

  /**
   * Create framework from rule
   */
  private createFramework(
    rule: DetectionRule,
    indicators: DetectionIndicator[]
  ): Framework {
    return {
      name: rule.framework || rule.name,
      type: this.determineFrameworkType(rule),
      confidence: rule.confidence,
      indicators: [indicators.find((i) => i.source.includes(rule.name)) || {
        type: rule.type === 'file-content' ? 'pattern' : rule.type,
        value: rule.name,
        confidence: rule.confidence,
        source: '',
      }],
      files: [],
    };
  }

  /**
   * Update or merge framework detection
   */
  private updateFramework(detected: Map<string, Framework>, framework: Framework): void {
    const existing = detected.get(framework.name);
    if (existing) {
      // Merge: increase confidence if higher, combine indicators and files
      existing.confidence = Math.max(existing.confidence, framework.confidence);
      existing.indicators.push(...framework.indicators);
      existing.files.push(...framework.files);
    } else {
      detected.set(framework.name, framework);
    }
  }

  /**
   * Determine framework type (frontend/backend)
   */
  private determineFrameworkType(rule: DetectionRule): 'frontend' | 'backend' {
    const frontendNames = ['react', 'vue', 'angular', 'svelte', 'nextjs', 'nuxtjs'];
    const backendNames = ['express', 'fastify', 'koa', 'nestjs', 'fastapi', 'flask', 'django'];

    const ruleName = (rule.framework || rule.name).toLowerCase();
    if (frontendNames.some((name) => ruleName.includes(name))) {
      return 'frontend';
    }
    if (backendNames.some((name) => ruleName.includes(name))) {
      return 'backend';
    }
    return 'backend'; // Default
  }

  /**
   * Create database from rule
   */
  private createDatabase(rule: DetectionRule, depName: string): Database {
    const dbTypes: Record<string, 'relational' | 'nosql' | 'graph' | 'key-value'> = {
      postgresql: 'relational',
      mysql: 'relational',
      sqlite: 'relational',
      mongodb: 'nosql',
      redis: 'key-value',
    };

    return {
      name: rule.framework || depName,
      type: dbTypes[rule.framework || ''] || 'relational',
      confidence: rule.confidence,
    };
  }

  /**
   * Create build tool from rule
   */
  private createBuildTool(
    rule: DetectionRule,
    configFiles: Map<string, FileNode>
  ): BuildTool {
    const configFileNames: string[] = [];
    for (const [relativePath] of configFiles) {
      const fileName = path.basename(relativePath);
      if (fileName.includes(rule.framework || '')) {
        configFileNames.push(relativePath);
      }
    }

    return {
      name: rule.framework || rule.name,
      type: 'bundler',
      configFiles: configFileNames,
    };
  }

  /**
   * Create testing tool from rule
   */
  private createTestingTool(
    rule: DetectionRule,
    configFiles: Map<string, FileNode>
  ): TestingTool {
    const configFileNames: string[] = [];
    for (const [relativePath] of configFiles) {
      const fileName = path.basename(relativePath);
      if (fileName.includes(rule.framework || '')) {
        configFileNames.push(relativePath);
      }
    }

    return {
      name: rule.framework || rule.name,
      framework: rule.framework,
      configFiles: configFileNames,
    };
  }

  /**
   * Calculate overall confidence
   */
  private calculateOverallConfidence(frameworks: Framework[]): number {
    if (frameworks.length === 0) {
      return 0;
    }

    const confidences = frameworks.map((f) => f.confidence);
    const avg = confidences.reduce((sum, c) => sum + c, 0) / confidences.length;
    return Math.min(1.0, avg);
  }
}

