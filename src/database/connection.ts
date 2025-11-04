/**
 * Database connection management
 */

import { Pool, PoolConfig, QueryResult } from 'pg';
import { logger } from '../utils/logger';

let pool: Pool | null = null;

export interface DatabaseConfig {
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
  connectionString?: string;
  ssl?: boolean;
  max?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
}

/**
 * Initialize database connection pool
 */
export function initializeDatabase(config: DatabaseConfig): Pool {
  if (pool) {
    return pool;
  }

  const poolConfig: PoolConfig = {
    host: config.host || process.env.POSTGRES_HOST || 'localhost',
    port: config.port || parseInt(process.env.POSTGRES_PORT || '5432', 10),
    database: config.database || process.env.POSTGRES_DB || 'code_assessment',
    user: config.user || process.env.POSTGRES_USER || 'postgres',
    password: config.password || process.env.POSTGRES_PASSWORD || 'postgres',
    max: config.max || 20,
    idleTimeoutMillis: config.idleTimeoutMillis || 30000,
    connectionTimeoutMillis: config.connectionTimeoutMillis || 10000,
    ssl: config.ssl || false,
  };

  if (config.connectionString) {
    poolConfig.connectionString = config.connectionString;
  }

  pool = new Pool(poolConfig);

  pool.on('error', (err) => {
    logger.error('Unexpected database pool error', { error: err.message, stack: err.stack });
  });

  pool.on('connect', () => {
    logger.debug('Database connection established');
  });

  logger.info('Database connection pool initialized', {
    host: poolConfig.host,
    port: poolConfig.port,
    database: poolConfig.database,
  });

  return pool;
}

/**
 * Get database connection pool
 */
export function getDatabasePool(): Pool {
  if (!pool) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return pool;
}

/**
 * Execute a query
 */
export async function query<T extends Record<string, any> = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  const db = getDatabasePool();
  const start = Date.now();
  
  try {
    const result = await db.query<T>(text, params);
    const duration = Date.now() - start;
    
    logger.debug('Database query executed', {
      query: text.substring(0, 100),
      duration: `${duration}ms`,
      rows: result.rowCount,
    });
    
    return result;
  } catch (error: any) {
    const duration = Date.now() - start;
    logger.error('Database query failed', {
      query: text.substring(0, 100),
      duration: `${duration}ms`,
      error: error.message,
    });
    throw error;
  }
}

/**
 * Test database connection
 */
export async function testConnection(): Promise<boolean> {
  try {
    await query('SELECT 1');
    return true;
  } catch (error: any) {
    logger.error('Database connection test failed', { error: error.message });
    return false;
  }
}

/**
 * Close database connection pool
 */
export async function closeDatabase(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    logger.info('Database connection pool closed');
  }
}

/**
 * Run database migrations
 */
export async function runMigrations(): Promise<void> {
  const db = getDatabasePool();
  
  try {
    // Check if migrations table exists
    const checkResult = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'schema_migrations'
      );
    `);

    if (!checkResult.rows[0].exists) {
      // Create migrations table
      await query(`
        CREATE TABLE schema_migrations (
          id SERIAL PRIMARY KEY,
          version VARCHAR(255) UNIQUE NOT NULL,
          name VARCHAR(255) NOT NULL,
          executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
    }

    // Get executed migrations
    const executedResult = await query('SELECT version FROM schema_migrations ORDER BY version');
    const executedVersions = new Set(executedResult.rows.map((r) => r.version));

    // Run pending migrations
    const migrations = getMigrationFiles();
    for (const migration of migrations) {
      if (!executedVersions.has(migration.version)) {
        logger.info('Running migration', { version: migration.version, name: migration.name });
        await db.query('BEGIN');
        
        try {
          await db.query(migration.sql);
          await db.query(
            'INSERT INTO schema_migrations (version, name) VALUES ($1, $2)',
            [migration.version, migration.name]
          );
          await db.query('COMMIT');
          logger.info('Migration completed', { version: migration.version });
        } catch (error: any) {
          await db.query('ROLLBACK');
          logger.error('Migration failed', { version: migration.version, error: error.message });
          throw error;
        }
      }
    }
  } catch (error: any) {
    logger.error('Migration process failed', { error: error.message });
    throw error;
  }
}

/**
 * Get migration files (in-memory for now, could read from filesystem)
 */
function getMigrationFiles(): Array<{ version: string; name: string; sql: string }> {
  return [
    {
      version: '001',
      name: 'create_analysis_results',
      sql: `
        CREATE TABLE IF NOT EXISTS analysis_results (
          id SERIAL PRIMARY KEY,
          repository VARCHAR(255) NOT NULL,
          repository_url VARCHAR(500),
          tech_stack JSONB,
          assessment_result JSONB,
          lineage_graph JSONB,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          status VARCHAR(50) DEFAULT 'completed',
          error_message TEXT
        );
        
        CREATE INDEX idx_analysis_results_repository ON analysis_results(repository);
        CREATE INDEX idx_analysis_results_created_at ON analysis_results(created_at);
        CREATE INDEX idx_analysis_results_status ON analysis_results(status);
      `,
    },
    {
      version: '002',
      name: 'create_impact_analyses',
      sql: `
        CREATE TABLE IF NOT EXISTS impact_analyses (
          id SERIAL PRIMARY KEY,
          analysis_result_id INTEGER REFERENCES analysis_results(id) ON DELETE CASCADE,
          change_request JSONB NOT NULL,
          impact_result JSONB NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE INDEX idx_impact_analyses_analysis_result_id ON impact_analyses(analysis_result_id);
      `,
    },
    {
      version: '003',
      name: 'create_validation_results',
      sql: `
        CREATE TABLE IF NOT EXISTS validation_results (
          id SERIAL PRIMARY KEY,
          test_case_id VARCHAR(255) NOT NULL,
          repository VARCHAR(255) NOT NULL,
          metrics JSONB NOT NULL,
          success BOOLEAN NOT NULL,
          errors TEXT[],
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE INDEX idx_validation_results_test_case_id ON validation_results(test_case_id);
        CREATE INDEX idx_validation_results_repository ON validation_results(repository);
      `,
    },
  ];
}
