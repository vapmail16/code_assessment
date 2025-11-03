/**
 * Package file analyzers for different package managers
 */

import * as fs from 'fs';
import * as path from 'path';
import { DetectionIndicator, Framework } from '../types';

export interface PackageDependencies {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
}

export interface PackageJson extends PackageDependencies {
  name?: string;
  version?: string;
  scripts?: Record<string, string>;
  engines?: Record<string, string>;
  [key: string]: any;
}

/**
 * Analyze package.json file
 */
export function analyzePackageJson(filePath: string): {
  packageData: PackageJson | null;
  dependencies: Map<string, string>;
  allDependencies: Map<string, string>;
  scripts: Record<string, string>;
  indicators: DetectionIndicator[];
} {
  const indicators: DetectionIndicator[] = [];
  const dependencies = new Map<string, string>();
  const allDependencies = new Map<string, string>();

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const packageData: PackageJson = JSON.parse(content);

    // Collect all dependencies
    const depSources = [
      { deps: packageData.dependencies, type: 'dependencies' },
      { deps: packageData.devDependencies, type: 'devDependencies' },
      { deps: packageData.peerDependencies, type: 'peerDependencies' },
      { deps: packageData.optionalDependencies, type: 'optionalDependencies' },
    ];

    for (const { deps, type } of depSources) {
      if (deps) {
        for (const [name, version] of Object.entries(deps)) {
          allDependencies.set(name, version);
          if (type === 'dependencies' || type === 'peerDependencies') {
            dependencies.set(name, version);
          }

          indicators.push({
            type: 'package-file',
            value: `${name}@${version}`,
            confidence: 0.9,
            source: filePath,
          });
        }
      }
    }

    // Add package.json indicator
    indicators.push({
      type: 'package-file',
      value: 'package.json',
      confidence: 1.0,
      source: filePath,
    });

    return {
      packageData,
      dependencies,
      allDependencies,
      scripts: packageData.scripts || {},
      indicators,
    };
  } catch (error) {
    return {
      packageData: null,
      dependencies,
      allDependencies,
      scripts: {},
      indicators,
    };
  }
}

/**
 * Analyze requirements.txt file
 */
export function analyzeRequirementsTxt(filePath: string): {
  packages: Map<string, string>;
  indicators: DetectionIndicator[];
} {
  const packages = new Map<string, string>();
  const indicators: DetectionIndicator[] = [];

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      // Skip comments and empty lines
      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }

      // Parse package line (supports: package==version, package>=version, etc.)
      const match = trimmed.match(/^([a-zA-Z0-9_-]+(?:\[.*?\])?)(.*)$/);
      if (match) {
        const packageName = match[1].split('[')[0]; // Remove extras like [dev]
        const versionSpec = match[2].trim() || '*';

        packages.set(packageName.toLowerCase(), versionSpec);

        indicators.push({
          type: 'package-file',
          value: `${packageName}${versionSpec}`,
          confidence: 0.9,
          source: filePath,
        });
      }
    }

    // Add requirements.txt indicator
    indicators.push({
      type: 'package-file',
      value: 'requirements.txt',
      confidence: 0.9,
      source: filePath,
    });
  } catch (error) {
    // File doesn't exist or can't be read
  }

  return { packages, indicators };
}

/**
 * Analyze Pipfile
 */
export function analyzePipfile(filePath: string): {
  packages: Map<string, string>;
  indicators: DetectionIndicator[];
} {
  const packages = new Map<string, string>();
  const indicators: DetectionIndicator[] = [];

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    // Simple TOML-like parsing (basic implementation)
    // For production, use a proper TOML parser
    const lines = content.split('\n');
    let inPackages = false;
    let inDevPackages = false;

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed === '[packages]') {
        inPackages = true;
        inDevPackages = false;
        continue;
      }
      if (trimmed === '[dev-packages]') {
        inPackages = false;
        inDevPackages = true;
        continue;
      }
      if (trimmed.startsWith('[')) {
        inPackages = false;
        inDevPackages = false;
        continue;
      }

      if (inPackages || inDevPackages) {
        const match = trimmed.match(/^([^=]+)\s*=\s*"([^"]+)"|'([^']+)'/);
        if (match) {
          const packageName = match[1].trim();
          const version = match[2] || match[3] || '*';
          packages.set(packageName.toLowerCase(), version);
        }
      }
    }

    indicators.push({
      type: 'package-file',
      value: 'Pipfile',
      confidence: 0.95,
      source: filePath,
    });
  } catch (error) {
    // File doesn't exist or can't be read
  }

  return { packages, indicators };
}

/**
 * Analyze go.mod file
 */
export function analyzeGoMod(filePath: string): {
  module: string | null;
  goVersion: string | null;
  requires: Map<string, string>;
  indicators: DetectionIndicator[];
} {
  const requires = new Map<string, string>();
  const indicators: DetectionIndicator[] = [];
  let module: string | null = null;
  let goVersion: string | null = null;

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('module ')) {
        module = trimmed.replace(/^module\s+/, '');
      } else if (trimmed.startsWith('go ')) {
        goVersion = trimmed.replace(/^go\s+/, '');
      } else if (trimmed.startsWith('require ')) {
        const requireLine = trimmed.replace(/^require\s+/, '');
        const parts = requireLine.split(/\s+/);
        if (parts.length >= 2) {
          requires.set(parts[0], parts[1]);
        }
      }
    }

    indicators.push({
      type: 'package-file',
      value: 'go.mod',
      confidence: 1.0,
      source: filePath,
    });
  } catch (error) {
    // File doesn't exist or can't be read
  }

  return { module, goVersion, requires, indicators };
}

