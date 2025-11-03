/**
 * Database schema extraction from migrations and models
 */

import * as fs from 'fs';
import * as path from 'path';
import { Table, Column, Index, ForeignKey, Relationship, DatabaseSchema } from '../../types';
import { FileNode } from '../../types';

/**
 * Extract schema from migration files
 */
export function extractSchemaFromMigrations(migrationFiles: FileNode[]): DatabaseSchema {
  const tables = new Map<string, Table>();
  const relationships: Relationship[] = [];

  for (const file of migrationFiles) {
    const content = fs.readFileSync(file.path, 'utf-8');
    const ext = path.extname(file.path).toLowerCase();

    if (ext === '.js' || ext === '.ts') {
      // JavaScript/TypeScript migration (Sequelize, TypeORM)
      const extracted = extractFromJSMigration(content, file.path);
      for (const table of extracted.tables) {
        if (tables.has(table.name)) {
          // Merge with existing table
          const existing = tables.get(table.name)!;
          existing.columns.push(...table.columns);
          existing.indexes.push(...table.indexes);
          existing.foreignKeys.push(...table.foreignKeys);
        } else {
          tables.set(table.name, table);
        }
      }
      relationships.push(...extracted.relationships);
    } else if (ext === '.py') {
      // Python migration (Django, Alembic)
      const extracted = extractFromPythonMigration(content, file.path);
      for (const table of extracted.tables) {
        if (tables.has(table.name)) {
          const existing = tables.get(table.name)!;
          existing.columns.push(...table.columns);
          existing.indexes.push(...table.indexes);
          existing.foreignKeys.push(...table.foreignKeys);
        } else {
          tables.set(table.name, table);
        }
      }
      relationships.push(...extracted.relationships);
    } else if (ext === '.sql') {
      // Raw SQL migration
      const extracted = extractFromSQL(content);
      for (const table of extracted.tables) {
        if (tables.has(table.name)) {
          const existing = tables.get(table.name)!;
          existing.columns.push(...table.columns);
          existing.indexes.push(...table.indexes);
          existing.foreignKeys.push(...table.foreignKeys);
        } else {
          tables.set(table.name, table);
        }
      }
      relationships.push(...extracted.relationships);
    }
  }

  return {
    tables: Array.from(tables.values()),
    relationships: deduplicateRelationships(relationships),
  };
}

/**
 * Extract from JavaScript/TypeScript migration (Sequelize, TypeORM)
 */
function extractFromJSMigration(content: string, filePath: string): {
  tables: Table[];
  relationships: Relationship[];
} {
  const tables: Table[] = [];
  const relationships: Relationship[] = [];

  // Sequelize pattern: queryInterface.createTable('tableName', {...})
  const sequelizePattern = /(?:queryInterface|QueryInterface)\.createTable\(['"]([^'"]+)['"]\s*,\s*\{/g;
  let match;

  while ((match = sequelizePattern.exec(content)) !== null) {
    const tableName = match[1];
    const tableStart = match.index + match[0].length;
    const tableDef = extractObjectDefinition(content, tableStart);

    const columns: Column[] = [];
    const indexes: Index[] = [];
    const foreignKeys: ForeignKey[] = [];

    // Extract columns from table definition
    extractSequelizeColumns(tableDef, columns, foreignKeys);

    tables.push({
      name: tableName,
      columns,
      indexes,
      foreignKeys,
    });
  }

  // TypeORM pattern: await queryRunner.createTable(...)
  const typeormPattern = /await\s+queryRunner\.createTable\([^,]+,\s*\{/g;
  // Similar extraction for TypeORM

  return { tables, relationships };
}

/**
 * Extract from Python migration (Django, Alembic)
 */
function extractFromPythonMigration(content: string, filePath: string): {
  tables: Table[];
  relationships: Relationship[];
} {
  const tables: Table[] = [];
  const relationships: Relationship[] = [];

  // Django pattern: migrations.CreateModel('ModelName', [...fields...])
  const djangoPattern = /migrations\.CreateModel\(['"]([^'"]+)['"]/g;
  let match;

  while ((match = djangoPattern.exec(content)) !== null) {
    const tableName = toSnakeCase(match[1]);
    // Extract fields from CreateModel arguments
    // This is simplified - full implementation would parse the field definitions
  }

  return { tables, relationships };
}

/**
 * Extract from raw SQL
 */
function extractFromSQL(content: string): {
  tables: Table[];
  relationships: Relationship[];
} {
  const tables: Table[] = [];
  const relationships: Relationship[] = [];

  // CREATE TABLE pattern
  const createTablePattern = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:`|"|\[)?([a-zA-Z_][a-zA-Z0-9_]*)(?:`|"|])?/gi;
  let match;

  while ((match = createTablePattern.exec(content)) !== null) {
    const tableName = match[1].toLowerCase();
    const tableStart = match.index;
    
    // Find table definition block
    const tableDef = extractSQLTableDefinition(content, tableStart);
    const columns = extractSQLColumns(tableDef);
    const indexes = extractSQLIndexes(tableDef);
    const foreignKeys = extractSQLForeignKeys(tableDef);

    tables.push({
      name: tableName,
      columns,
      indexes,
      foreignKeys,
    });

    // Extract relationships from foreign keys
    for (const fk of foreignKeys) {
      relationships.push({
        from: tableName,
        to: fk.referencedTable.toLowerCase(),
        type: 'one-to-many',
        foreignKey: fk.column,
      });
    }
  }

  return { tables, relationships };
}

/**
 * Extract Sequelize columns
 */
function extractSequelizeColumns(
  tableDef: string,
  columns: Column[],
  foreignKeys: ForeignKey[]
): void {
  // Pattern: columnName: { type: Sequelize.STRING, allowNull: false, ... }
  const columnPattern = /([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*\{([^}]+)\}/g;
  let match;

  while ((match = columnPattern.exec(tableDef)) !== null) {
    const columnName = match[1];
    const columnDef = match[2];

    // Extract type
    const typeMatch = columnDef.match(/type:\s*Sequelize\.(\w+)/i);
    const type = typeMatch ? typeMatch[1].toLowerCase() : 'unknown';

    // Extract nullable
    const nullable = !columnDef.includes('allowNull: false');

    // Check for foreign key
    const fkMatch = columnDef.match(/references:\s*\{\s*model:\s*['"]([^'"]+)['"]\s*,\s*key:\s*['"]([^'"]+)['"]/);
    if (fkMatch) {
      foreignKeys.push({
        column: columnName,
        referencedTable: fkMatch[1].toLowerCase(),
        referencedColumn: fkMatch[2],
      });
    }

    columns.push({
      name: columnName,
      type,
      nullable,
      constraints: extractConstraints(columnDef),
    });
  }
}

/**
 * Extract SQL columns from CREATE TABLE
 */
function extractSQLColumns(tableDef: string): Column[] {
  const columns: Column[] = [];
  const lines = tableDef.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('--') || trimmed.startsWith('PRIMARY') || trimmed.startsWith('FOREIGN')) {
      continue;
    }

    // Column definition: name type [constraints]
    const columnMatch = trimmed.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s+(\w+(?:\(\d+\))?)/i);
    if (columnMatch) {
      const name = columnMatch[1];
      const type = columnMatch[2].toLowerCase();
      const nullable = !trimmed.toUpperCase().includes('NOT NULL');
      
      const defaultValue = extractDefaultValue(trimmed);
      const constraints = extractSQLConstraints(trimmed);

      columns.push({
        name,
        type,
        nullable,
        defaultValue,
        constraints,
      });
    }
  }

  return columns;
}

/**
 * Extract SQL indexes
 */
function extractSQLIndexes(tableDef: string): Index[] {
  const indexes: Index[] = [];

  // CREATE INDEX pattern
  const indexPattern = /CREATE\s+(?:UNIQUE\s+)?INDEX\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+ON\s+[^\s]+\s*\(([^)]+)\)/gi;
  let match;

  while ((match = indexPattern.exec(tableDef)) !== null) {
    const name = match[1];
    const columns = match[2].split(',').map((c) => c.trim().replace(/`|"|\[|\]/g, ''));
    const unique = match[0].toUpperCase().includes('UNIQUE');

    indexes.push({
      name,
      columns,
      unique,
    });
  }

  return indexes;
}

/**
 * Extract SQL foreign keys
 */
function extractSQLForeignKeys(tableDef: string): ForeignKey[] {
  const foreignKeys: ForeignKey[] = [];

  // FOREIGN KEY pattern
  const fkPattern = /FOREIGN\s+KEY\s*\(([^)]+)\)\s+REFERENCES\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([^)]+)\)/gi;
  let match;

  while ((match = fkPattern.exec(tableDef)) !== null) {
    const column = match[1].trim().replace(/`|"|\[|\]/g, '');
    const referencedTable = match[2].toLowerCase();
    const referencedColumn = match[3].trim().replace(/`|"|\[|\]/g, '');

    foreignKeys.push({
      column,
      referencedTable,
      referencedColumn,
    });
  }

  return foreignKeys;
}

/**
 * Extract SQL table definition block
 */
function extractSQLTableDefinition(content: string, startPos: number): string {
  let depth = 0;
  let inTable = false;
  let def = '';
  let i = startPos;

  while (i < content.length) {
    const char = content[i];

    if (char === '(') {
      inTable = true;
      depth++;
    } else if (char === ')') {
      depth--;
      if (depth === 0 && inTable) {
        break;
      }
    }

    if (inTable) {
      def += char;
    }

    i++;
  }

  return def;
}

/**
 * Extract object definition (for JavaScript/TypeScript)
 */
function extractObjectDefinition(content: string, startPos: number): string {
  let depth = 0;
  let def = '';
  let i = startPos;

  while (i < content.length) {
    const char = content[i];

    if (char === '{') {
      depth++;
    } else if (char === '}') {
      depth--;
      if (depth === 0) {
        def += char;
        break;
      }
    }

    if (depth > 0) {
      def += char;
    }

    i++;
  }

  return def;
}

/**
 * Extract default value
 */
function extractDefaultValue(columnDef: string): any {
  const defaultMatch = columnDef.match(/DEFAULT\s+([^\s,)]+)/i);
  if (defaultMatch) {
    const value = defaultMatch[1].trim();
    // Try to parse as number
    if (!isNaN(Number(value))) {
      return Number(value);
    }
    // Remove quotes if string
    if ((value.startsWith("'") && value.endsWith("'")) || (value.startsWith('"') && value.endsWith('"'))) {
      return value.slice(1, -1);
    }
    return value;
  }
  return undefined;
}

/**
 * Extract SQL constraints
 */
function extractSQLConstraints(columnDef: string): string[] {
  const constraints: string[] = [];
  const upper = columnDef.toUpperCase();

  if (upper.includes('PRIMARY KEY')) {
    constraints.push('PRIMARY KEY');
  }
  if (upper.includes('UNIQUE')) {
    constraints.push('UNIQUE');
  }
  if (upper.includes('AUTO_INCREMENT') || upper.includes('SERIAL')) {
    constraints.push('AUTO_INCREMENT');
  }

  return constraints;
}

/**
 * Extract constraints from column definition
 */
function extractConstraints(columnDef: string): string[] {
  const constraints: string[] = [];
  const upper = columnDef.toUpperCase();

  if (upper.includes('PRIMARYKEY') || upper.includes('PRIMARY KEY')) {
    constraints.push('PRIMARY KEY');
  }
  if (upper.includes('UNIQUE')) {
    constraints.push('UNIQUE');
  }

  return constraints;
}

/**
 * Convert CamelCase to snake_case
 */
function toSnakeCase(str: string): string {
  return str.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
}

/**
 * Deduplicate relationships
 */
function deduplicateRelationships(relationships: Relationship[]): Relationship[] {
  const seen = new Set<string>();
  const unique: Relationship[] = [];

  for (const rel of relationships) {
    const key = `${rel.from}-${rel.to}-${rel.type}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(rel);
    }
  }

  return unique;
}

