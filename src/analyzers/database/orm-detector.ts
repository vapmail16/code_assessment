/**
 * ORM model detection and parsing
 */

import * as fs from 'fs';
import traverse from '@babel/traverse';
import * as t from '@babel/types';
import { parse } from '@babel/parser';
import { Table, Column, Relationship, Index, ForeignKey } from '../../types';
import { ParsedFile } from '../../types';

/**
 * Extract schema from ORM models
 */
export function extractSchemaFromModels(parsedFiles: ParsedFile[]): {
  tables: Table[];
  relationships: Relationship[];
} {
  const tables: Table[] = [];
  const relationships: Relationship[] = [];

  for (const parsedFile of parsedFiles) {
    if (!parsedFile.ast) {
      continue;
    }

    const ast = parsedFile.ast as t.File;

    // Detect ORM type
    const hasSequelize = checkORM(parsedFile, 'sequelize');
    const hasTypeORM = checkORM(parsedFile, 'typeorm');
    const hasPrisma = checkORM(parsedFile, 'prisma');

    if (hasSequelize) {
      const extracted = extractSequelizeModels(ast, parsedFile);
      tables.push(...extracted.tables);
      relationships.push(...extracted.relationships);
    } else if (hasTypeORM) {
      const extracted = extractTypeORMModels(ast, parsedFile);
      tables.push(...extracted.tables);
      relationships.push(...extracted.relationships);
    } else if (hasPrisma) {
      // Prisma uses schema.prisma file - would need separate parser
    }
  }

  return { tables, relationships };
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
 * Extract Sequelize models
 */
function extractSequelizeModels(ast: t.File, parsedFile: ParsedFile): {
  tables: Table[];
  relationships: Relationship[];
} {
  const tables: Table[] = [];
  const relationships: Relationship[] = [];

  traverse(ast, {
    ClassDeclaration(path) {
      const classNode = path.node;
      if (!classNode.id) {
        return;
      }

      // Check if extends Model or Sequelize.Model
      const extendsModel =
        classNode.superClass &&
        ((t.isIdentifier(classNode.superClass) && classNode.superClass.name === 'Model') ||
          (t.isMemberExpression(classNode.superClass) &&
            t.isIdentifier(classNode.superClass.object) &&
            classNode.superClass.object.name === 'Sequelize' &&
            t.isIdentifier(classNode.superClass.property) &&
            classNode.superClass.property.name === 'Model'));

      if (!extendsModel) {
        return;
      }

      const modelName = classNode.id.name;
      const tableName = toSnakeCase(modelName);

      // Extract table name from init() call or tableName property
      let actualTableName = tableName;

      // Extract columns from static init() or define()
      const columns: Column[] = [];
      const indexes: Index[] = [];
      const foreignKeys: ForeignKey[] = [];

      // Look for static init() method or model definition
      for (const member of classNode.body.body) {
        if (t.isClassMethod(member) && t.isIdentifier(member.key) && member.key.name === 'init') {
          // Extract from init() arguments
          if (member.params.length > 0 && t.isObjectExpression(member.params[0])) {
            extractSequelizeModelFields(member.params[0], columns, foreignKeys);
          }
        }

        // Associations (hasMany, belongsTo, etc.)
        if (t.isClassMethod(member)) {
          const associations = extractSequelizeAssociations(member, modelName);
          relationships.push(...associations);
        }
      }

      tables.push({
        name: actualTableName,
        columns: columns.length > 0 ? columns : [], // If no columns extracted, empty array
        indexes,
        foreignKeys,
      });
    },
  });

  return { tables, relationships };
}

/**
 * Extract TypeORM entities
 */
function extractTypeORMModels(ast: t.File, parsedFile: ParsedFile): {
  tables: Table[];
  relationships: Relationship[];
} {
  const tables: Table[] = [];
  const relationships: Relationship[] = [];

  traverse(ast, {
    ClassDeclaration(path) {
      const classNode = path.node;
      if (!classNode.id) {
        return;
      }

      // Check for @Entity() decorator
      const hasEntityDecorator = classNode.decorators?.some((decorator) => {
        if (t.isDecorator(decorator) && t.isCallExpression(decorator.expression)) {
          const callee = decorator.expression.callee;
          return (
            (t.isIdentifier(callee) && callee.name === 'Entity') ||
            (t.isMemberExpression(callee) &&
              t.isIdentifier(callee.property) &&
              callee.property.name === 'Entity')
          );
        }
        return false;
      });

      if (!hasEntityDecorator) {
        return;
      }

      const entityName = classNode.id.name;
      let tableName = toSnakeCase(entityName);

      // Extract table name from @Entity('tableName') decorator
      const entityDecorator = classNode.decorators?.find((d) => {
        if (t.isDecorator(d) && t.isCallExpression(d.expression)) {
          const callee = d.expression.callee;
          return (
            (t.isIdentifier(callee) && callee.name === 'Entity') ||
            (t.isMemberExpression(callee) && t.isIdentifier(callee.property) && callee.property.name === 'Entity')
          );
        }
        return false;
      });

      if (entityDecorator && t.isDecorator(entityDecorator) && t.isCallExpression(entityDecorator.expression)) {
        const args = entityDecorator.expression.arguments;
        if (args.length > 0 && t.isStringLiteral(args[0])) {
          tableName = args[0].value;
        }
      }

      const columns: Column[] = [];
      const indexes: Index[] = [];
      const foreignKeys: ForeignKey[] = [];

      // Extract columns from class properties with decorators
      for (const member of classNode.body.body) {
        if (t.isClassProperty(member) && t.isIdentifier(member.key)) {
          const column = extractTypeORMColumn(member, entityName);
          if (column) {
            columns.push(column);
          }

          // Check for foreign key relationships
          const relation = extractTypeORMRelation(member, entityName, tableName);
          if (relation) {
            relationships.push(relation);
          }
        }
      }

      tables.push({
        name: tableName,
        columns,
        indexes,
        foreignKeys,
      });
    },
  });

  return { tables, relationships };
}

/**
 * Extract Sequelize model fields
 */
function extractSequelizeModelFields(
  fieldsObj: t.ObjectExpression,
  columns: Column[],
  foreignKeys: ForeignKey[]
): void {
  for (const prop of fieldsObj.properties) {
    if (t.isObjectProperty(prop) && t.isIdentifier(prop.key)) {
      const columnName = prop.key.name;

      if (t.isObjectExpression(prop.value)) {
        // Extract type
        let type = 'unknown';
        for (const fieldProp of prop.value.properties) {
          if (t.isObjectProperty(fieldProp) && t.isIdentifier(fieldProp.key) && fieldProp.key.name === 'type') {
            if (t.isStringLiteral(fieldProp.value)) {
              type = fieldProp.value.value;
            } else if (t.isMemberExpression(fieldProp.value)) {
              // Sequelize.STRING, etc.
              if (t.isIdentifier(fieldProp.value.property)) {
                type = fieldProp.value.property.name.toLowerCase();
              }
            }
          }
        }

        columns.push({
          name: columnName,
          type,
          nullable: true, // Default
        });
      }
    }
  }
}

/**
 * Extract Sequelize associations
 */
function extractSequelizeAssociations(member: t.ClassMethod, modelName: string): Relationship[] {
  const relationships: Relationship[] = [];

  if (!t.isIdentifier(member.key)) {
    return relationships;
  }

  const methodName = member.key.name;
  const associationMethods = ['hasMany', 'belongsTo', 'hasOne', 'belongsToMany'];

  if (!associationMethods.includes(methodName)) {
    return relationships;
  }

  // Simplified - would need to parse the association arguments
  // hasMany(OtherModel) -> many-to-one
  // belongsTo(OtherModel) -> many-to-one (reversed)
  // hasOne(OtherModel) -> one-to-one
  // belongsToMany(OtherModel) -> many-to-many

  return relationships;
}

/**
 * Extract TypeORM column
 */
function extractTypeORMColumn(member: t.ClassProperty, entityName: string): Column | null {
  if (!member.decorators || member.decorators.length === 0) {
    return null;
  }

  // Check for @Column() decorator
  const hasColumnDecorator = member.decorators.some((decorator) => {
    if (t.isDecorator(decorator) && t.isCallExpression(decorator.expression)) {
      const callee = decorator.expression.callee;
      return (
        (t.isIdentifier(callee) && callee.name === 'Column') ||
        (t.isMemberExpression(callee) && t.isIdentifier(callee.property) && callee.property.name === 'Column')
      );
    }
    return false;
  });

  if (!hasColumnDecorator && t.isIdentifier(member.key)) {
    return {
      name: member.key.name,
      type: inferTypeFromProperty(member),
      nullable: true,
    };
  }

  return null;
}

/**
 * Extract TypeORM relation
 */
function extractTypeORMRelation(
  member: t.ClassProperty,
  entityName: string,
  tableName: string
): Relationship | null {
  if (!member.decorators || !t.isIdentifier(member.key)) {
    return null;
  }

  // Check for relation decorators
  const relationTypes = ['OneToOne', 'OneToMany', 'ManyToOne', 'ManyToMany'];

  for (const decorator of member.decorators) {
    if (t.isDecorator(decorator) && t.isCallExpression(decorator.expression)) {
      const callee = decorator.expression.callee;
      let relationType: string | null = null;

      if (t.isIdentifier(callee)) {
        if (relationTypes.includes(callee.name)) {
          relationType = callee.name;
        }
      } else if (t.isMemberExpression(callee) && t.isIdentifier(callee.property)) {
        if (relationTypes.includes(callee.property.name)) {
          relationType = callee.property.name;
        }
      }

      if (relationType) {
        // Extract target entity from decorator arguments
        const args = decorator.expression.arguments;
        if (args.length > 0) {
          let targetEntity = 'Unknown';

          // Try to extract from arrow function or string
          if (t.isArrowFunctionExpression(args[0])) {
            // (entity) => entity.OtherEntity
            // Would need more complex parsing
          } else if (t.isStringLiteral(args[0])) {
            targetEntity = args[0].value;
          }

          return {
            from: tableName,
            to: toSnakeCase(targetEntity),
            type: mapTypeORMRelationType(relationType),
            foreignKey: member.key.name,
          };
        }
      }
    }
  }

  return null;
}

/**
 * Map TypeORM relation type to our type
 */
function mapTypeORMRelationType(typeormType: string): 'one-to-one' | 'one-to-many' | 'many-to-many' {
  if (typeormType === 'OneToOne') {
    return 'one-to-one';
  } else if (typeormType === 'OneToMany' || typeormType === 'ManyToOne') {
    return 'one-to-many';
  } else if (typeormType === 'ManyToMany') {
    return 'many-to-many';
  }
  return 'one-to-one'; // Default
}

/**
 * Infer type from property
 */
function inferTypeFromProperty(property: t.ClassProperty): string {
  // Check type annotation if available
  if (property.typeAnnotation && t.isTSTypeAnnotation(property.typeAnnotation)) {
    const type = property.typeAnnotation.typeAnnotation;
    if (t.isTSStringKeyword(type)) {
      return 'string';
    } else if (t.isTSNumberKeyword(type)) {
      return 'number';
    } else if (t.isTSBooleanKeyword(type)) {
      return 'boolean';
    }
  }

  return 'unknown';
}

/**
 * Convert CamelCase to snake_case
 */
function toSnakeCase(str: string): string {
  return str.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
}

