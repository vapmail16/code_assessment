/**
 * Database migrations
 */

import { query, testConnection } from './connection';
import { readFileSync } from 'fs';
import { join } from 'path';
import { logger } from '../utils/logger';

/**
 * Run database migrations
 */
export async function runMigrations(): Promise<void> {
  try {
    // Test connection first
    const connected = await testConnection();
    if (!connected) {
      throw new Error('Database connection failed');
    }

    logger.info('Running database migrations...');

    // Read schema file
    const schemaPath = join(__dirname, 'schema.sql');
    let schemaSQL: string;

    try {
      schemaSQL = readFileSync(schemaPath, 'utf-8');
    } catch (error: any) {
      logger.warn('Schema file not found, using inline schema', { error: error.message });
      // Fallback: execute schema inline
      await executeSchemaInline();
      return;
    }

    // Execute schema (split by semicolons, but handle functions carefully)
    const statements = schemaSQL
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await query(statement);
        } catch (error: any) {
          // Ignore "already exists" errors
          if (!error.message.includes('already exists') && !error.message.includes('duplicate')) {
            logger.warn('Migration statement failed', {
              error: error.message,
              statement: statement.substring(0, 100),
            });
          }
        }
      }
    }

    logger.info('Database migrations completed');
  } catch (error: any) {
    logger.error('Migration failed', { error: error.message, stack: error.stack });
    throw error;
  }
}

/**
 * Execute schema inline (fallback)
 */
async function executeSchemaInline(): Promise<void> {
  // This would contain the same SQL as schema.sql
  // For now, we'll just log that migrations should be run manually
  logger.warn(
    'Please run database migrations manually using: psql -U postgres -d code_assessment -f src/database/schema.sql'
  );
}

/**
 * Check if database is initialized
 */
export async function isDatabaseInitialized(): Promise<boolean> {
  try {
    const result = await query(
      "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'analysis_results')"
    );
    return result.rows[0].exists;
  } catch {
    return false;
  }
}
