/**
 * Database connection management
 */

import { Pool, PoolConfig, QueryResult, QueryResultRow } from 'pg';
import { logger } from '../utils/logger';

let pool: Pool | null = null;

export interface DatabaseConfig {
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
  connectionString?: string;
  max?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
}

/**
 * Initialize database connection pool
 */
export function initializeDatabase(config?: DatabaseConfig): Pool {
  if (pool) {
    return pool;
  }

  const poolConfig: PoolConfig = {
    host: config?.host || process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(config?.port?.toString() || process.env.POSTGRES_PORT || '5432', 10),
    database: config?.database || process.env.POSTGRES_DB || 'code_assessment',
    user: config?.user || process.env.POSTGRES_USER || 'postgres',
    password: config?.password || process.env.POSTGRES_PASSWORD || 'postgres',
    max: config?.max || parseInt(process.env.POSTGRES_MAX_CONNECTIONS || '20', 10),
    idleTimeoutMillis: config?.idleTimeoutMillis || 30000,
    connectionTimeoutMillis: config?.connectionTimeoutMillis || 2000,
  };

  // Use connection string if provided
  if (config?.connectionString || process.env.DATABASE_URL) {
    poolConfig.connectionString = config?.connectionString || process.env.DATABASE_URL;
  }

  pool = new Pool(poolConfig);

  // Handle pool errors
  pool.on('error', (err) => {
    logger.error('Unexpected database pool error', { error: err.message, stack: err.stack });
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
export function getDatabase(): Pool {
  if (!pool) {
    return initializeDatabase();
  }
  return pool;
}

/**
 * Execute a query
 */
export async function query<T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  const db = getDatabase();
  const start = Date.now();

  try {
    const result = await db.query<T>(text, params);
    const duration = Date.now() - start;
    logger.debug('Database query executed', { query: text, duration, rows: result.rowCount });
    return result;
  } catch (error: any) {
    logger.error('Database query failed', {
      query: text,
      params,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

/**
 * Execute a transaction
 */
export async function transaction<T>(
  callback: (client: any) => Promise<T>
): Promise<T> {
  const db = getDatabase();
  const client = await db.connect();

  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Test database connection
 */
export async function testConnection(): Promise<boolean> {
  try {
    const result = await query('SELECT NOW()');
    return result.rows.length > 0;
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
 * Check if database is initialized
 */
export function isDatabaseInitialized(): boolean {
  return pool !== null;
}
