/**
 * Frontend code parser using Babel
 */

import { parse, ParserOptions } from '@babel/parser';
import traverse from '@babel/traverse';
import * as t from '@babel/types';
import * as fs from 'fs';
import { ParsedFile, Import, Export, FunctionDefinition, ClassDefinition } from '../../types';

export interface ParseOptions {
  sourceType?: 'module' | 'script';
  allowImportExportEverywhere?: boolean;
}

/**
 * Parse a frontend file and extract AST structure
 */
export function parseFrontendFile(
  filePath: string,
  content?: string,
  options: ParseOptions = {}
): ParsedFile | null {
  try {
    const fileContent = content || fs.readFileSync(filePath, 'utf-8');
    const ext = filePath.split('.').pop()?.toLowerCase();

    // Configure parser based on file extension
    const parserOptions: ParserOptions = {
      sourceType: options.sourceType || 'module',
      allowImportExportEverywhere: options.allowImportExportEverywhere || false,
      allowReturnOutsideFunction: true,
      plugins: [
        'jsx',
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

    // Extract information from AST
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

      ExportNamedDeclaration(path) {
        if (path.node.declaration) {
          // Export with declaration
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
          // Export specifiers
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
        // Only track arrow functions that are assigned to variables
        if (t.isVariableDeclarator(path.parent)) {
          const id = path.parent.id;
          if (t.isIdentifier(id)) {
            const params = path.node.params.map((p) => {
              if (t.isIdentifier(p)) {
                return p.name;
              }
              return 'unknown';
            });

            functions.push({
              name: id.name,
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
      language: ext === 'tsx' || ext === 'ts' ? 'typescript' : 'javascript',
      ast: ast as any, // Store full AST for further analysis
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
 * Calculate cyclomatic complexity (simplified)
 */
function calculateComplexity(ast: t.File): number {
  let complexity = 1; // Base complexity

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

