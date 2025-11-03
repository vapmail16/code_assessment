/**
 * Service layer detection
 */

import { Service } from '../../types';
import { ParsedFile } from '../../types';

/**
 * Detect service classes/functions
 */
export function detectServices(parsedFiles: ParsedFile[]): Service[] {
  const services: Service[] = [];

  for (const parsedFile of parsedFiles) {
    // Detect service by naming convention or patterns
    const fileName = parsedFile.path.split('/').pop() || '';
    const isServiceFile = fileName.includes('service') || fileName.includes('Service');

    if (isServiceFile) {
      for (const cls of parsedFile.classes || []) {
        services.push({
          name: cls.name,
          file: parsedFile.path,
          methods: cls.methods || [],
          dependencies: extractDependencies(parsedFile),
        });
      }

      // Also check for exported functions (functional services)
      for (const func of parsedFile.functions || []) {
        const isExported = parsedFile.exports.some((e) => e.name === func.name);
        if (isExported) {
          services.push({
            name: func.name,
            file: parsedFile.path,
            methods: [func.name],
            dependencies: extractDependencies(parsedFile),
          });
        }
      }
    }
  }

  return services;
}

/**
 * Extract dependencies from imports
 */
function extractDependencies(parsedFile: ParsedFile): string[] {
  const dependencies: string[] = [];

  for (const imp of parsedFile.imports) {
    // Skip node_modules imports, focus on local imports
    if (imp.from.startsWith('.') || imp.from.startsWith('/')) {
      dependencies.push(imp.from);
    }
  }

  return dependencies;
}

