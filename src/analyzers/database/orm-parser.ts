/**
 * ORM model parser
 */

import * as fs from 'fs';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import * as t from '@babel/types';
import { Table, Column, Relationship } from '../../types';
import { ParsedFile } from '../../types';

/**
 * Parse Sequelize models
 */
export function parseSequelizeModel(parsedFile: ParsedFile): Table[] {
  const tables: Table[] = [];

  if (!parsedFile.ast) {
    return tables;
  }

  const ast = parsedFile.ast as t.File;

  traverse(ast, {
    CallExpression(path) {
      const node = path.node;
      
      // sequelize.define() or Model.init()
      if (t.isMemberExpression(node.callee)) {
        const obj = node.callee.object;
        const prop = node.callee.property;

        if (t.isIdentifier(prop)) {
          if (prop.name === 'define' || prop.name === 'init') {
            const table = extractSequelizeTable(node, parsedFile);
            if (table) {
              tables.push(table);
            }
          }
        }
      }
    },

    // Also check for class extends Model
    ClassDeclaration(path) {
      if (
        path.node.superClass &&
        (t.isIdentifier(path.node.superClass) && path.node.superClass.name === 'Model') ||
        (t.isMemberExpression(path.node.superClass) &&
          t.isIdentifier(path.node.superClass.property) &&
          path.node.superClass.property.name === 'Model')
      ) {
        const table = extractSequelizeClassModel(path.node, parsedFile);
        if (table) {
          tables.push(table);
        }
      }
    },
  });

  return tables;
}

/**
 * Extract Sequelize table from define/init call
 */
function extractSequelizeTable(node: t.CallExpression, parsedFile: ParsedFile): Table | null {
  if (node.arguments.length < 2) {
    return null;
  }

  const tableNameArg = node.arguments[0];
  const attributesArg = node.arguments[1];

  let tableName = '';
  if (t.isStringLiteral(tableNameArg)) {
    tableName = tableNameArg.value;
  } else {
    return null;
  }

  const table: Table = {
    name: tableName,
    columns: [],
    indexes: [],
    foreignKeys: [],
  };

  if (t.isObjectExpression(attributesArg)) {
    table.columns = extractSequelizeColumns(attributesArg);
  }

  return table;
}

/**
 * Extract columns from Sequelize attributes
 */
function extractSequelizeColumns(attributes: t.ObjectExpression): Column[] {
  const columns: Column[] = [];

  for (const prop of attributes.properties) {
    if (t.isObjectProperty(prop) && t.isIdentifier(prop.key)) {
      const columnName = prop.key.name;
      
      if (t.isObjectExpression(prop.value)) {
        const columnDef = prop.value;
        const column: Column = {
          name: columnName,
          type: 'VARCHAR',
          nullable: true,
          defaultValue: undefined,
        };

        // Extract type
        for (const colProp of columnDef.properties) {
          if (t.isObjectProperty(colProp) && t.isIdentifier(colProp.key)) {
            const key = colProp.key.name;

            if (key === 'type') {
              if (t.isMemberExpression(colProp.value)) {
                const typeName = t.isIdentifier(colProp.value.property)
                  ? colProp.value.property.name
                  : 'VARCHAR';
                column.type = mapSequelizeType(typeName);
              }
            } else if (key === 'allowNull') {
              if (t.isBooleanLiteral(colProp.value)) {
                column.nullable = colProp.value.value;
              } else if (t.isIdentifier(colProp.value) && colProp.value.name === 'false') {
                column.nullable = false;
              }
            } else if (key === 'defaultValue') {
              if (t.isStringLiteral(colProp.value) || t.isNumericLiteral(colProp.value)) {
                column.defaultValue = colProp.value.value;
              }
            }
          }
        }

        columns.push(column);
      }
    }
  }

  return columns;
}

/**
 * Map Sequelize DataType to SQL type
 */
function mapSequelizeType(sequelizeType: string): string {
  const typeMap: Record<string, string> = {
    STRING: 'VARCHAR',
    TEXT: 'TEXT',
    INTEGER: 'INTEGER',
    BIGINT: 'BIGINT',
    FLOAT: 'FLOAT',
    DOUBLE: 'DOUBLE',
    DECIMAL: 'DECIMAL',
    DATE: 'DATE',
    BOOLEAN: 'BOOLEAN',
    UUID: 'UUID',
    JSON: 'JSON',
    JSONB: 'JSONB',
  };

  return typeMap[sequelizeType.toUpperCase()] || sequelizeType;
}

/**
 * Extract Sequelize model from class
 */
function extractSequelizeClassModel(node: t.ClassDeclaration, parsedFile: ParsedFile): Table | null {
  if (!node.id) {
    return null;
  }

  const table: Table = {
    name: node.id.name.toLowerCase() + 's', // Pluralize (common Sequelize convention)
    columns: [],
    indexes: [],
    foreignKeys: [],
  };

  // Extract from class properties/methods (simplified)
  // In practice, would need to look for init() calls or decorators

  return table;
}

/**
 * Parse TypeORM entities
 */
export function parseTypeORMEntity(parsedFile: ParsedFile): Table[] {
  const tables: Table[] = [];

  if (!parsedFile.ast) {
    return tables;
  }

  const ast = parsedFile.ast as t.File;

  traverse(ast, {
    ClassDeclaration(path) {
      const node = path.node;
      
      // Check for @Entity decorator or extends BaseEntity
      let isEntity = false;
      
      if (node.decorators) {
        for (const decorator of node.decorators) {
          if (t.isCallExpression(decorator.expression)) {
            if (t.isIdentifier(decorator.expression.callee)) {
              if (decorator.expression.callee.name === 'Entity') {
                isEntity = true;
              }
            }
          }
        }
      }

      if (isEntity || (node.superClass && t.isIdentifier(node.superClass) && node.superClass.name === 'BaseEntity')) {
        const table = extractTypeORMEntity(node, parsedFile);
        if (table) {
          tables.push(table);
        }
      }
    },
  });

  return tables;
}

/**
 * Extract TypeORM entity table
 */
function extractTypeORMEntity(node: t.ClassDeclaration, parsedFile: ParsedFile): Table | null {
  if (!node.id) {
    return null;
  }

  const table: Table = {
    name: node.id.name.toLowerCase() + 's',
    columns: [],
    indexes: [],
    foreignKeys: [],
  };

  // Extract columns from class properties
  for (const member of node.body.body) {
    if (t.isClassProperty(member) && t.isIdentifier(member.key)) {
      const column = extractTypeORMColumn(member);
      if (column) {
        table.columns.push(column);
      }
    }
  }

  return table;
}

/**
 * Extract TypeORM column from property
 */
function extractTypeORMColumn(prop: t.ClassProperty): Column | null {
  if (!t.isIdentifier(prop.key)) {
    return null;
  }

      const column: Column = {
        name: prop.key.name,
        type: prop.typeAnnotation && t.isTSTypeAnnotation(prop.typeAnnotation)
          ? inferTypeFromTypeAnnotation(prop.typeAnnotation)
          : 'VARCHAR',
        nullable: true,
        defaultValue: undefined,
      };

  // Check decorators for column metadata
  if (prop.decorators) {
    for (const decorator of prop.decorators) {
      if (t.isCallExpression(decorator.expression)) {
        if (t.isIdentifier(decorator.expression.callee)) {
          const decoratorName = decorator.expression.callee.name;

          if (decoratorName === 'Column') {
            // Extract column options
            if (decorator.expression.arguments.length > 0 && t.isObjectExpression(decorator.expression.arguments[0])) {
              const options = decorator.expression.arguments[0];
              for (const opt of options.properties) {
                if (t.isObjectProperty(opt) && t.isIdentifier(opt.key)) {
                  if (opt.key.name === 'type' && t.isStringLiteral(opt.value)) {
                    column.type = opt.value.value;
                  } else if (opt.key.name === 'nullable' && t.isBooleanLiteral(opt.value)) {
                    column.nullable = opt.value.value;
                  }
                }
              }
            }
          } else if (decoratorName === 'PrimaryGeneratedColumn') {
            column.constraints = ['PRIMARY KEY', 'AUTO_INCREMENT'];
          }
        }
      }
    }
  }

  return column;
}

/**
 * Infer type from TypeScript type annotation
 */
function inferTypeFromTypeAnnotation(annotation: t.TSTypeAnnotation | null | undefined): string {
  if (!annotation) {
    return 'VARCHAR';
  }

  if (!t.isTSTypeAnnotation(annotation)) {
    return 'VARCHAR';
  }

  const type = annotation.typeAnnotation;
  if (t.isTSTypeReference(type) && t.isIdentifier(type.typeName)) {
    const typeName = type.typeName.name;
    const typeMap: Record<string, string> = {
      string: 'VARCHAR',
      number: 'INTEGER',
      boolean: 'BOOLEAN',
      Date: 'DATE',
    };
    return typeMap[typeName] || 'VARCHAR';
  }

  return 'VARCHAR';
}

/**
 * Parse Prisma schema
 */
export function parsePrismaSchema(filePath: string): Table[] {
  const tables: Table[] = [];

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    let currentModel: Table | null = null;

    for (const line of lines) {
      const trimmed = line.trim();

      // Model definition
      if (trimmed.startsWith('model ')) {
        if (currentModel) {
          tables.push(currentModel);
        }

        const modelMatch = trimmed.match(/model\s+(\w+)/);
        if (modelMatch) {
          currentModel = {
            name: modelMatch[1],
            columns: [],
            indexes: [],
            foreignKeys: [],
          };
        }
      } else if (trimmed === '}') {
        if (currentModel) {
          tables.push(currentModel);
          currentModel = null;
        }
      } else if (currentModel && trimmed && !trimmed.startsWith('//')) {
        // Column definition
        const columnMatch = trimmed.match(/^(\w+)\s+(\w+(?:\[\])?)(?:\s+(.*))?$/);
        if (columnMatch) {
          const name = columnMatch[1];
          const type = columnMatch[2];
          const constraints = columnMatch[3] || '';

          const column: Column = {
            name,
            type: mapPrismaType(type),
            nullable: !constraints.includes('@id') && type.endsWith('?'),
            defaultValue: extractPrismaDefault(constraints),
            constraints: extractPrismaConstraints(constraints),
          };

          // Check for relations
          if (constraints.includes('@relation')) {
            const relationMatch = constraints.match(/@relation\(fields:\s*\[(\w+)\],\s*references:\s*\[(\w+)\]\)/);
            if (relationMatch) {
              currentModel.foreignKeys.push({
                column: relationMatch[1],
                referencedTable: extractRelationTableName(constraints),
                referencedColumn: relationMatch[2],
              });
            }
          }

          currentModel.columns.push(column);
        }
      }
    }
  } catch (error) {
    // File doesn't exist or can't be read
  }

  return tables;
}

/**
 * Map Prisma type to SQL type
 */
function mapPrismaType(prismaType: string): string {
  const typeMap: Record<string, string> = {
    String: 'VARCHAR',
    Int: 'INTEGER',
    BigInt: 'BIGINT',
    Float: 'FLOAT',
    Decimal: 'DECIMAL',
    Boolean: 'BOOLEAN',
    DateTime: 'TIMESTAMP',
    Json: 'JSON',
    Bytes: 'BLOB',
  };

  const baseType = prismaType.replace('[]', '').replace('?', '');
  return typeMap[baseType] || baseType;
}

/**
 * Extract default value from Prisma constraints
 */
function extractPrismaDefault(constraints: string): any {
  const defaultMatch = constraints.match(/@default\(([^)]+)\)/);
  if (defaultMatch) {
    return defaultMatch[1].replace(/['"]/g, '');
  }
  return undefined;
}

/**
 * Extract Prisma constraints
 */
function extractPrismaConstraints(constraints: string): string[] {
  const extracted: string[] = [];

  if (constraints.includes('@id')) {
    extracted.push('PRIMARY KEY');
  }
  if (constraints.includes('@unique')) {
    extracted.push('UNIQUE');
  }

  return extracted;
}

/**
 * Extract relation table name from Prisma relation
 */
function extractRelationTableName(constraints: string): string {
  const relationMatch = constraints.match(/references:\s*\[(\w+)\]/);
  // This is simplified - would need full parsing
  return relationMatch ? relationMatch[1] : 'unknown';
}

