/**
 * Database query detection for backend code
 */

import traverse, { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import { DatabaseQuery } from '../../types';
import { ParsedFile } from '../../types';

/**
 * Detect database queries in backend code
 */
export function detectDatabaseQueries(parsedFile: ParsedFile): DatabaseQuery[] {
  const queries: DatabaseQuery[] = [];

  if (!parsedFile.ast) {
    return queries;
  }

  const ast = parsedFile.ast as t.File;

  // Detect ORM type
  const hasSequelize = checkORM(parsedFile, 'sequelize');
  const hasTypeORM = checkORM(parsedFile, 'typeorm');
  const hasPrisma = checkORM(parsedFile, 'prisma');
  const hasSQLAlchemy = checkORM(parsedFile, 'sqlalchemy');

  if (hasSequelize) {
    queries.push(...detectSequelizeQueries(ast, parsedFile));
  } else if (hasTypeORM) {
    queries.push(...detectTypeORMQueries(ast, parsedFile));
  } else if (hasPrisma) {
    queries.push(...detectPrismaQueries(ast, parsedFile));
  } else if (hasSQLAlchemy) {
    queries.push(...detectSQLAlchemyQueries(ast, parsedFile));
  }

  // Also detect raw SQL queries
  queries.push(...detectRawSQLQueries(ast, parsedFile));

  return queries;
}

/**
 * Check if ORM is used
 */
function checkORM(parsedFile: ParsedFile, orm: string): boolean {
  for (const imp of parsedFile.imports) {
    if (imp.from.toLowerCase().includes(orm)) {
      return true;
    }
  }
  return false;
}

/**
 * Detect Sequelize queries
 */
function detectSequelizeQueries(ast: t.File, parsedFile: ParsedFile): DatabaseQuery[] {
  const queries: DatabaseQuery[] = [];
  let queryId = 0;

  const sequelizeMethods = [
    'findAll',
    'findOne',
    'findByPk',
    'findAndCountAll',
    'create',
    'update',
    'destroy',
    'upsert',
    'bulkCreate',
    'bulkUpdate',
    'count',
  ];

  traverse(ast, {
    CallExpression(path) {
      const callExpr = path.node;
      if (t.isMemberExpression(callExpr.callee)) {
        const prop = callExpr.callee.property;

        if (t.isIdentifier(prop) && sequelizeMethods.includes(prop.name)) {
          const query = extractORMQuery(
            callExpr,
            prop.name,
            parsedFile,
            path,
            `sequelize-${++queryId}`,
            'sequelize'
          );
          if (query) {
            queries.push(query);
          }
        }

        // Model.findAll(), User.findByPk(), etc.
        if (t.isMemberExpression(callExpr.callee.object) && t.isIdentifier(prop)) {
          const obj = callExpr.callee.object;
          if (t.isIdentifier(obj.property) && sequelizeMethods.includes(prop.name)) {
            const modelName = obj.property.name;
            const query = extractORMQuery(
              callExpr,
              prop.name,
              parsedFile,
              path,
              `sequelize-${++queryId}`,
              'sequelize',
              modelName
            );
            if (query) {
              queries.push(query);
            }
          }
        }
      }
    },
  });

  return queries;
}

/**
 * Detect TypeORM queries
 */
function detectTypeORMQueries(ast: t.File, parsedFile: ParsedFile): DatabaseQuery[] {
  const queries: DatabaseQuery[] = [];
  let queryId = 0;

  const typeormMethods = ['find', 'findOne', 'save', 'remove', 'delete', 'update', 'insert'];

  traverse(ast, {
    CallExpression(path) {
      const callExpr = path.node;
      if (t.isMemberExpression(callExpr.callee)) {
        const prop = callExpr.callee.property;

        if (t.isIdentifier(prop) && typeormMethods.includes(prop.name)) {
          const query = extractORMQuery(
            callExpr,
            prop.name,
            parsedFile,
            path,
            `typeorm-${++queryId}`,
            'typeorm'
          );
          if (query) {
            queries.push(query);
          }
        }

        // repository.find(), manager.save(), etc.
        if (t.isMemberExpression(callExpr.callee.object) && t.isIdentifier(prop)) {
          const obj = callExpr.callee.object;
          if (
            (t.isIdentifier(obj.property) && obj.property.name === 'repository') ||
            (t.isIdentifier(obj.property) && obj.property.name === 'manager')
          ) {
            if (typeormMethods.includes(prop.name)) {
              const query = extractORMQuery(
                callExpr,
                prop.name,
                parsedFile,
                path,
                `typeorm-${++queryId}`,
                'typeorm'
              );
              if (query) {
                queries.push(query);
              }
            }
          }
        }
      }
    },
  });

  return queries;
}

/**
 * Detect Prisma queries
 */
function detectPrismaQueries(ast: t.File, parsedFile: ParsedFile): DatabaseQuery[] {
  const queries: DatabaseQuery[] = [];
  let queryId = 0;

  traverse(ast, {
    CallExpression(path) {
      const callExpr = path.node;
      if (t.isMemberExpression(callExpr.callee)) {
        // prisma.user.findMany(), prisma.post.create(), etc.
        const obj = callExpr.callee.object;
        const prop = callExpr.callee.property;

        if (t.isMemberExpression(obj) && t.isIdentifier(obj.property) && t.isIdentifier(prop)) {
          // obj.property is the model name, prop is the method
          const modelName = obj.property.name;
          const method = prop.name;

          const prismaMethods = [
            'findMany',
            'findUnique',
            'findFirst',
            'create',
            'update',
            'delete',
            'upsert',
            'count',
            'aggregate',
          ];

          if (prismaMethods.includes(method)) {
            const query = extractORMQuery(
              callExpr,
              method,
              parsedFile,
              path,
              `prisma-${++queryId}`,
              'prisma',
              modelName
            );
            if (query) {
              queries.push(query);
            }
          }
        }
      }
    },
  });

  return queries;
}

/**
 * Detect SQLAlchemy queries (Python - basic pattern matching)
 */
function detectSQLAlchemyQueries(ast: t.File, parsedFile: ParsedFile): DatabaseQuery[] {
  // SQLAlchemy is Python, so we'd need Python AST parsing
  // For now, return empty array
  return [];
}

/**
 * Detect raw SQL queries
 */
function detectRawSQLQueries(ast: t.File, parsedFile: ParsedFile): DatabaseQuery[] {
  const queries: DatabaseQuery[] = [];
  let queryId = 0;

  const sqlMethods = ['query', 'execute', 'raw'];

  traverse(ast, {
    CallExpression(path) {
      const callExpr = path.node;
      if (t.isMemberExpression(callExpr.callee)) {
        const prop = callExpr.callee.property;

        if (t.isIdentifier(prop) && sqlMethods.includes(prop.name.toLowerCase())) {
          // Check for SQL string in arguments
          if (callExpr.arguments.length > 0) {
            const sqlArg = callExpr.arguments[0];
            if (t.isStringLiteral(sqlArg)) {
              const sql = sqlArg.value;
              const tables = extractTablesFromSQL(sql);

              queries.push({
                id: `sql-${++queryId}`,
                file: parsedFile.path,
                function: findContainingFunction(path),
                type: inferQueryType(sql),
                sql,
                tables: tables.length > 0 ? tables : undefined,
                line: callExpr.loc?.start.line || 0,
                confidence: 0.9,
              });
            }
          }
        }
      }
    },
  });

  return queries;
}

/**
 * Extract ORM query
 */
function extractORMQuery(
  node: t.CallExpression,
  method: string,
  parsedFile: ParsedFile,
  path: NodePath<t.CallExpression>,
  id: string,
  ormType: string,
  modelName?: string
): DatabaseQuery | null {
  const queryType = inferORMQueryType(method);

  return {
    id,
    file: parsedFile.path,
    function: findContainingFunction(path),
    type: queryType,
    table: modelName,
    ormMethod: method,
    line: node.loc?.start.line || 0,
    confidence: 0.85,
  };
}

/**
 * Infer query type from ORM method
 */
function inferORMQueryType(method: string): 'select' | 'insert' | 'update' | 'delete' {
  const selectMethods = ['findAll', 'findOne', 'find', 'findByPk', 'findAndCountAll', 'findMany', 'findUnique', 'findFirst', 'count'];
  const insertMethods = ['create', 'bulkCreate', 'save', 'insert', 'upsert'];
  const updateMethods = ['update', 'bulkUpdate', 'save'];
  const deleteMethods = ['destroy', 'remove', 'delete'];

  if (selectMethods.includes(method)) {
    return 'select';
  } else if (insertMethods.includes(method)) {
    return 'insert';
  } else if (updateMethods.includes(method)) {
    return 'update';
  } else if (deleteMethods.includes(method)) {
    return 'delete';
  }

  return 'select'; // Default
}

/**
 * Infer query type from SQL
 */
function inferQueryType(sql: string): 'select' | 'insert' | 'update' | 'delete' {
  const upperSQL = sql.trim().toUpperCase();
  if (upperSQL.startsWith('SELECT')) {
    return 'select';
  } else if (upperSQL.startsWith('INSERT')) {
    return 'insert';
  } else if (upperSQL.startsWith('UPDATE')) {
    return 'update';
  } else if (upperSQL.startsWith('DELETE')) {
    return 'delete';
  }
  return 'select'; // Default to select for unknown SQL
}

/**
 * Extract table names from SQL
 */
function extractTablesFromSQL(sql: string): string[] {
  const tables: string[] = [];
  const upperSQL = sql.toUpperCase();

  // Simple regex patterns for common SQL statements
  const patterns = [
    /FROM\s+([a-zA-Z_][a-zA-Z0-9_]*)/gi,
    /INTO\s+([a-zA-Z_][a-zA-Z0-9_]*)/gi,
    /UPDATE\s+([a-zA-Z_][a-zA-Z0-9_]*)/gi,
    /JOIN\s+([a-zA-Z_][a-zA-Z0-9_]*)/gi,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(sql)) !== null) {
      const tableName = match[1].toLowerCase();
      if (!tables.includes(tableName)) {
        tables.push(tableName);
      }
    }
  }

  return tables;
}

/**
 * Find containing function name
 */
function findContainingFunction(path: NodePath<t.CallExpression>): string | undefined {
  let currentPath: NodePath | null = path.parentPath;
  while (currentPath) {
    const node = currentPath.node;

    if (t.isFunctionDeclaration(node) && node.id) {
      return node.id.name;
    } else if (t.isFunctionExpression(node) || t.isArrowFunctionExpression(node)) {
      const parentPath = currentPath.parentPath;
      if (parentPath && t.isVariableDeclarator(parentPath.node)) {
        const varDecl = parentPath.node;
        if (t.isIdentifier(varDecl.id)) {
          return varDecl.id.name;
        }
      }
      return 'anonymous';
    }

    currentPath = currentPath.parentPath;
  }
  return undefined;
}

