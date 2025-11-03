/**
 * Backend code parser for Node.js and Python
 */

import { parse, ParserOptions } from '@babel/parser';
import traverse from '@babel/traverse';
import * as t from '@babel/types';
import * as fs from 'fs';
import { ParsedFile, Import, Export, FunctionDefinition, ClassDefinition } from '../../types';

export interface BackendParseOptions {
  sourceType?: 'module' | 'script';
  language?: 'javascript' | 'typescript' | 'python';
}

/**
 * Parse a backend JavaScript/TypeScript file
 */
export function parseBackendFile(
  filePath: string,
  content?: string,
  options: BackendParseOptions = {}
): ParsedFile | null {
  const ext = filePath.split('.').pop()?.toLowerCase();
  const isTypeScript = ext === 'ts' || ext === 'tsx';

  try {
    const fileContent = content || fs.readFileSync(filePath, 'utf-8');

    // Configure parser
    const parserOptions: ParserOptions = {
      sourceType: options.sourceType || 'module',
      allowReturnOutsideFunction: true,
      plugins: [
        'typescript',
        'decorators-legacy',
        'classProperties',
        'objectRestSpread',
        'asyncGenerators',
        'functionBind',
        'exportDefaultFrom',
        'exportNamespaceFrom',
        'dynamicImport',
        'nullishCoalescingOperator',
        'optionalChaining',
      ],
    };

    const ast = parse(fileContent, parserOptions);

    // Extract information
    const imports: Import[] = [];
    const exports: Export[] = [];
    const functions: FunctionDefinition[] = [];
    const classes: ClassDefinition[] = [];
    let linesOfCode = fileContent.split('\n').length;

    traverse(ast, {
      ImportDeclaration(path) {
        const source = path.node.source.value;
        const specifiers = path.node.specifiers || [];

        const defaultImport = specifiers.find((s) => t.isImportDefaultSpecifier(s));
        const namedImports = specifiers
          .filter((s) => t.isImportSpecifier(s))
          .map((s) => {
            const imported = (s as t.ImportSpecifier).imported;
            return t.isIdentifier(imported) ? imported.name : (imported as t.StringLiteral).value;
          });

        imports.push({
          from: source,
          default: defaultImport?.local.name,
          named: namedImports.length > 0 ? namedImports : undefined,
          type: 'import',
          line: path.node.loc?.start.line || 0,
        });
      },

      // Require statements
      CallExpression(path) {
        if (
          t.isIdentifier(path.node.callee) &&
          path.node.callee.name === 'require' &&
          path.node.arguments.length > 0 &&
          t.isStringLiteral(path.node.arguments[0])
        ) {
          imports.push({
            from: path.node.arguments[0].value,
            type: 'require',
            line: path.node.loc?.start.line || 0,
          });
        }
      },

      ExportNamedDeclaration(path) {
        if (path.node.declaration) {
          if (t.isFunctionDeclaration(path.node.declaration) && path.node.declaration.id) {
            exports.push({
              name: path.node.declaration.id.name,
              type: 'named',
              line: path.node.loc?.start.line || 0,
            });
          } else if (t.isClassDeclaration(path.node.declaration) && path.node.declaration.id) {
            exports.push({
              name: path.node.declaration.id.name,
              type: 'named',
              line: path.node.loc?.start.line || 0,
            });
          }
        } else if (path.node.specifiers) {
          for (const spec of path.node.specifiers) {
            if (t.isExportSpecifier(spec)) {
              let name = 'unknown';
              if (t.isIdentifier(spec.exported)) {
                name = spec.exported.name;
              } else if (t.isStringLiteral(spec.exported)) {
                name = spec.exported.value;
              }
              exports.push({
                name,
                type: 'named',
                line: path.node.loc?.start.line || 0,
              });
            }
          }
        }
      },

      ExportDefaultDeclaration(path) {
        let name = 'default';
        if (t.isIdentifier(path.node.declaration)) {
          name = path.node.declaration.name;
        } else if (t.isFunctionDeclaration(path.node.declaration) && path.node.declaration.id) {
          name = path.node.declaration.id.name;
        } else if (t.isClassDeclaration(path.node.declaration) && path.node.declaration.id) {
          name = path.node.declaration.id.name;
        }

        exports.push({
          name,
          type: 'default',
          line: path.node.loc?.start.line || 0,
        });
      },

      FunctionDeclaration(path) {
        if (path.node.id) {
          const params = path.node.params.map((p) => {
            if (t.isIdentifier(p)) {
              return p.name;
            }
            return 'unknown';
          });

          functions.push({
            name: path.node.id.name,
            line: path.node.loc?.start.line || 0,
            parameters: params,
          });
        }
      },

      ArrowFunctionExpression(path) {
        if (t.isVariableDeclarator(path.parent)) {
          const varDecl = path.parent;
          if (t.isIdentifier(varDecl.id)) {
            const params = path.node.params.map((p) => {
              if (t.isIdentifier(p)) {
                return p.name;
              }
              return 'unknown';
            });

            functions.push({
              name: varDecl.id.name,
              line: path.node.loc?.start.line || 0,
              parameters: params,
            });
          }
        }
      },

      ClassDeclaration(path) {
        if (path.node.id) {
          const methods: string[] = [];
          for (const member of path.node.body.body) {
            if (t.isClassMethod(member) && t.isIdentifier(member.key)) {
              methods.push(member.key.name);
            }
          }

          classes.push({
            name: path.node.id.name,
            line: path.node.loc?.start.line || 0,
            methods,
            extends: path.node.superClass && t.isIdentifier(path.node.superClass)
              ? path.node.superClass.name
              : undefined,
          });
        }
      },
    });

    return {
      path: filePath,
      language: isTypeScript ? 'typescript' : 'javascript',
      ast: ast as any, // Store full AST
      imports,
      exports,
      functions,
      classes,
      linesOfCode,
      complexity: calculateComplexity(ast),
    };
  } catch (error: any) {
    console.error(`Failed to parse ${filePath}:`, error.message);
    return null;
  }
}

/**
 * Parse Python file (basic AST parsing)
 */
export function parsePythonFile(
  filePath: string,
  content?: string
): ParsedFile | null {
  try {
    const fileContent = content || fs.readFileSync(filePath, 'utf-8');

    // For Python, we'll use a simpler approach
    // In production, use python AST module via subprocess or a Python parser library
    const imports: Import[] = [];
    const exports: Export[] = [];
    const functions: FunctionDefinition[] = [];
    const classes: ClassDefinition[] = [];
    const linesOfCode = fileContent.split('\n').length;

    // Simple regex-based extraction for Python
    const lines = fileContent.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Import statements
      if (line.startsWith('import ')) {
        const match = line.match(/^import\s+([^\s,]+)/);
        if (match) {
          imports.push({
            from: match[1],
            type: 'import',
            line: i + 1,
          });
        }
      } else if (line.startsWith('from ')) {
        const match = line.match(/^from\s+([^\s]+)\s+import\s+(.+)$/);
        if (match) {
          const module = match[1];
          const imports_list = match[2].split(',').map((s) => s.trim());
          imports.push({
            from: module,
            named: imports_list,
            type: 'import',
            line: i + 1,
          });
        }
      }

      // Function definitions
      const funcMatch = line.match(/^def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/);
      if (funcMatch) {
        const paramsMatch = line.match(/\(([^)]*)\)/);
        const params = paramsMatch
          ? paramsMatch[1]
              .split(',')
              .map((p) => p.trim().split('=')[0].split(':')[0].trim())
              .filter((p) => p)
          : [];

        functions.push({
          name: funcMatch[1],
          line: i + 1,
          parameters: params,
        });
      }

      // Class definitions
      const classMatch = line.match(/^class\s+([a-zA-Z_][a-zA-Z0-9_]*)/);
      if (classMatch) {
        classes.push({
          name: classMatch[1],
          line: i + 1,
          methods: [], // Would need full parsing to extract methods
        });
      }
    }

    return {
      path: filePath,
      language: 'python',
      imports,
      exports,
      functions,
      classes,
      linesOfCode,
      complexity: 0, // Would need proper calculation
    };
  } catch (error: any) {
    console.error(`Failed to parse ${filePath}:`, error.message);
    return null;
  }
}

/**
 * Calculate cyclomatic complexity (simplified)
 */
function calculateComplexity(ast: t.File): number {
  let complexity = 1;

  traverse(ast, {
    IfStatement: () => complexity++,
    ForStatement: () => complexity++,
    ForInStatement: () => complexity++,
    ForOfStatement: () => complexity++,
    WhileStatement: () => complexity++,
    DoWhileStatement: () => complexity++,
    SwitchCase: () => complexity++,
    CatchClause: () => complexity++,
    ConditionalExpression: () => complexity++,
    LogicalExpression(path) {
      if (path.node.operator === '&&' || path.node.operator === '||') {
        complexity++;
      }
    },
  });

  return complexity;
}

