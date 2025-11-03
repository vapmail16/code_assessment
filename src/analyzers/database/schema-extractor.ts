/**
 * Database schema extraction
 */

import * as fs from 'fs';
import * as path from 'path';
import { Table, Column, Index, ForeignKey, DatabaseSchema } from '../../types';
import { FileNode } from '../../types';

/**
 * Extract schema from migration files
 */
export function extractSchemaFromMigrations(migrationFiles: FileNode[]): DatabaseSchema {
  const tables: Table[] = [];
  const relationships: any[] = [];

  for (const file of migrationFiles) {
    const content = fs.readFileSync(file.path, 'utf-8');
    const extractedTables = parseMigrationFile(content, file.path);
    tables.push(...extractedTables);
  }

  // Extract relationships from foreign keys
  for (const table of tables) {
    for (const fk of table.foreignKeys) {
      relationships.push({
        from: table.name,
        to: fk.referencedTable,
        type: 'many-to-one',
        foreignKey: fk.column,
      });
    }
  }

  return {
    tables,
    relationships,
  };
}

/**
 * Parse migration file content
 */
function parseMigrationFile(content: string, filePath: string): Table[] {
  const tables: Table[] = [];

  // Detect migration type
  const isSequelize = content.includes('sequelize') || content.includes('queryInterface');
  const isTypeORM = content.includes('createTable') || content.includes('Table');
  const isPrisma = content.includes('prisma') || filePath.includes('prisma/migrations');
  const isKnex = content.includes('knex') || content.includes('schema.createTable');
  const isRawSQL = content.match(/CREATE\s+TABLE/i);

  if (isSequelize) {
    return parseSequelizeMigration(content);
  } else if (isTypeORM) {
    return parseTypeORMMigration(content);
  } else if (isKnex) {
    return parseKnexMigration(content);
  } else if (isRawSQL) {
    return parseSQLSchema(content);
  }

  return tables;
}

/**
 * Parse Sequelize migration
 */
function parseSequelizeMigration(content: string): Table[] {
  const tables: Table[] = [];

  // Extract createTable calls
  const createTableRegex = /(?:queryInterface\.createTable|sequelize\.define)\s*\(['"]([^'"]+)['"]/gi;
  let match;

  while ((match = createTableRegex.exec(content)) !== null) {
    const tableName = match[1];
    const table: Table = {
      name: tableName,
      columns: [],
      indexes: [],
      foreignKeys: [],
    };

    // Extract column definitions (simplified - would need full parsing)
    const tableBlock = extractTableBlock(content, tableName);
    if (tableBlock) {
      table.columns = parseColumnsFromBlock(tableBlock);
      table.foreignKeys = parseForeignKeysFromBlock(tableBlock);
    }

    tables.push(table);
  }

  return tables;
}

/**
 * Parse TypeORM migration
 */
function parseTypeORMMigration(content: string): Table[] {
  const tables: Table[] = [];

  // TypeORM uses createTable pattern
  const createTableRegex = /createTable\s*\(['"]([^'"]+)['"]/gi;
  let match;

  while ((match = createTableRegex.exec(content)) !== null) {
    const tableName = match[1];
    const table: Table = {
      name: tableName,
      columns: [],
      indexes: [],
      foreignKeys: [],
    };

    tables.push(table);
  }

  return tables;
}

/**
 * Parse Knex migration
 */
function parseKnexMigration(content: string): Table[] {
  const tables: Table[] = [];

  // Knex uses schema.createTable pattern
  const createTableRegex = /\.createTable\s*\(['"]([^'"]+)['"]/gi;
  let match;

  while ((match = createTableRegex.exec(content)) !== null) {
    const tableName = match[1];
    const table: Table = {
      name: tableName,
      columns: [],
      indexes: [],
      foreignKeys: [],
    };

    tables.push(table);
  }

  return tables;
}

/**
 * Parse SQL CREATE TABLE statements
 */
function parseSQLSchema(content: string): Table[] {
  const tables: Table[] = [];

  // Match CREATE TABLE statements
  const createTableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:`?(\w+)`?\.)?`?(\w+)`?/gi;
  let match;

  while ((match = createTableRegex.exec(content)) !== null) {
    const schemaName = match[1];
    const tableName = match[2];
    
    const table: Table = {
      name: tableName,
      schema: schemaName,
      columns: [],
      indexes: [],
      foreignKeys: [],
    };

    // Extract table body
    const tableStart = match.index + match[0].length;
    const tableBody = extractSQLTableBody(content, tableStart);
    
    if (tableBody) {
      table.columns = parseSQLColumns(tableBody);
      table.foreignKeys = parseSQLForeignKeys(tableBody);
      table.indexes = parseSQLIndexes(tableBody);
      table.primaryKey = parseSQLPrimaryKey(tableBody);
    }

    tables.push(table);
  }

  return tables;
}

/**
 * Extract table block from migration
 */
function extractTableBlock(content: string, tableName: string): string | null {
  // Simplified extraction - would need proper parsing
  const startPattern = new RegExp(`(?:createTable|define)\\s*\\(['"]${tableName}['"]`, 'i');
  const startMatch = content.match(startPattern);
  
  if (!startMatch) {
    return null;
  }

  let depth = 0;
  let inBlock = false;
  let blockStart = startMatch.index! + startMatch[0].length;

  for (let i = blockStart; i < content.length; i++) {
    const char = content[i];
    
    if (char === '{' || char === '(') {
      depth++;
      inBlock = true;
    } else if (char === '}' || char === ')') {
      depth--;
      if (inBlock && depth === 0) {
        return content.substring(blockStart, i);
      }
    }
  }

  return null;
}

/**
 * Parse columns from table block
 */
function parseColumnsFromBlock(block: string): Column[] {
  const columns: Column[] = [];

  // Simplified parsing - extract column-like patterns
  const columnPatterns = [
    /(\w+):\s*\{\s*type:\s*DataTypes\.(\w+)/gi,
    /(\w+):\s*Sequelize\.(\w+)/gi,
  ];

  for (const pattern of columnPatterns) {
    let match;
    while ((match = pattern.exec(block)) !== null) {
      columns.push({
        name: match[1],
        type: match[2],
        nullable: true, // Would need to check allowNull
        defaultValue: undefined,
      });
    }
  }

  return columns;
}

/**
 * Parse foreign keys from block
 */
function parseForeignKeysFromBlock(block: string): ForeignKey[] {
  const foreignKeys: ForeignKey[] = [];

  // Look for references patterns
  const fkPattern = /references:\s*\{?\s*model:\s*['"]([^'"]+)['"]\s*,\s*key:\s*['"]([^'"]+)['"]/gi;
  let match;

  while ((match = fkPattern.exec(block)) !== null) {
    // Would need to find the column this FK belongs to
    foreignKeys.push({
      column: 'unknown', // Would extract from context
      referencedTable: match[1],
      referencedColumn: match[2],
    });
  }

  return foreignKeys;
}

/**
 * Extract SQL table body
 */
function extractSQLTableBody(content: string, startPos: number): string | null {
  let depth = 0;
  let foundStart = false;

  for (let i = startPos; i < content.length; i++) {
    const char = content[i];
    
    if (char === '(') {
      depth++;
      foundStart = true;
    } else if (char === ')') {
      depth--;
      if (foundStart && depth === 0) {
        return content.substring(startPos + 1, i).trim();
      }
    }
  }

  return null;
}

/**
 * Parse SQL columns
 */
function parseSQLColumns(body: string): Column[] {
  const columns: Column[] = [];
  const lines = body.split(',').map((l) => l.trim());

  for (const line of lines) {
    // Match column definition: name type [constraints]
    const columnMatch = line.match(/^`?(\w+)`?\s+(\w+(?:\([^)]+\))?)\s*(.*)$/i);
    if (columnMatch) {
      const name = columnMatch[1];
      const type = columnMatch[2];
      const constraints = columnMatch[3];

      columns.push({
        name,
        type,
        nullable: !constraints.toUpperCase().includes('NOT NULL'),
        defaultValue: extractDefaultValue(constraints),
        constraints: extractConstraints(constraints),
      });
    }
  }

  return columns;
}

/**
 * Parse SQL foreign keys
 */
function parseSQLForeignKeys(body: string): ForeignKey[] {
  const foreignKeys: ForeignKey[] = [];

  // Match FOREIGN KEY constraints
  const fkPattern = /FOREIGN\s+KEY\s*\(`?(\w+)`?\)\s*REFERENCES\s+`?(\w+)`?\s*\(`?(\w+)`?\)/gi;
  let match;

  while ((match = fkPattern.exec(body)) !== null) {
    foreignKeys.push({
      column: match[1],
      referencedTable: match[2],
      referencedColumn: match[3],
    });
  }

  return foreignKeys;
}

/**
 * Parse SQL indexes
 */
function parseSQLIndexes(body: string): Index[] {
  const indexes: Index[] = [];

  // Match INDEX or UNIQUE INDEX
  const indexPattern = /(?:UNIQUE\s+)?INDEX\s+(?:`?(\w+)`?\s+)?\(`?(\w+)`?(?:\s*,\s*`?(\w+)`?)*\)/gi;
  let match;

  while ((match = indexPattern.exec(body)) !== null) {
    const indexName = match[1] || 'unnamed';
    const columns = [match[2]].concat(match[3] ? [match[3]] : []);

    indexes.push({
      name: indexName,
      columns,
      unique: body.substring(match.index, match.index + match[0].length).includes('UNIQUE'),
    });
  }

  return indexes;
}

/**
 * Parse SQL primary key
 */
function parseSQLPrimaryKey(body: string): string[] | undefined {
  const pkPattern = /PRIMARY\s+KEY\s*\(`?(\w+)`?(?:\s*,\s*`?(\w+)`?)*\)/gi;
  const match = pkPattern.exec(body);

  if (match) {
    const columns = [match[1]].concat(match[2] ? [match[2]] : []);
    return columns;
  }

  return undefined;
}

/**
 * Extract default value from constraints
 */
function extractDefaultValue(constraints: string): any {
  const defaultMatch = constraints.match(/DEFAULT\s+([^\s,]+)/i);
  if (defaultMatch) {
    const value = defaultMatch[1];
    // Remove quotes if present
    return value.replace(/^['"]|['"]$/g, '');
  }
  return undefined;
}

/**
 * Extract constraints from SQL
 */
function extractConstraints(constraints: string): string[] {
  const extracted: string[] = [];

  if (constraints.toUpperCase().includes('NOT NULL')) {
    extracted.push('NOT NULL');
  }
  if (constraints.toUpperCase().includes('UNIQUE')) {
    extracted.push('UNIQUE');
  }
  if (constraints.toUpperCase().includes('AUTO_INCREMENT')) {
    extracted.push('AUTO_INCREMENT');
  }

  return extracted;
}

