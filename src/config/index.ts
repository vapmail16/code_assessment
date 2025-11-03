/**
 * Configuration management
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load .env file if it exists
const envPath = path.join(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

export interface Config {
  github: {
    token?: string;
    rateLimit: {
      requestsPerHour: number;
    };
  };
  server: {
    port: number;
    host: string;
    cors: {
      enabled: boolean;
      origin?: string | string[];
    };
    rateLimit: {
      enabled: boolean;
      windowMs: number;
      max: number;
    };
  };
  analysis: {
    useExternalScanners: boolean;
    timeout: number; // milliseconds
    maxFileSize: number; // bytes
  };
  logging: {
    level: 'error' | 'warn' | 'info' | 'debug';
    format: 'json' | 'text';
    file?: string;
  };
  cache: {
    enabled: boolean;
    ttl: number; // seconds
  };
}

/**
 * Load configuration from environment variables
 */
export function loadConfig(): Config {
  return {
    github: {
      token: process.env.GITHUB_TOKEN,
      rateLimit: {
        requestsPerHour: parseInt(process.env.GITHUB_RATE_LIMIT || '5000', 10),
      },
    },
    server: {
      port: parseInt(process.env.PORT || '3000', 10),
      host: process.env.HOST || '0.0.0.0',
      cors: {
        enabled: process.env.CORS_ENABLED !== 'false',
        origin: process.env.CORS_ORIGIN?.split(',') || '*',
      },
      rateLimit: {
        enabled: process.env.RATE_LIMIT_ENABLED !== 'false',
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
        max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
      },
    },
    analysis: {
      useExternalScanners: process.env.USE_EXTERNAL_SCANNERS !== 'false',
      timeout: parseInt(process.env.ANALYSIS_TIMEOUT || '300000', 10), // 5 minutes
      maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10), // 10MB
    },
    logging: {
      level: (process.env.LOG_LEVEL as Config['logging']['level']) || 'info',
      format: (process.env.LOG_FORMAT as Config['logging']['format']) || 'text',
      file: process.env.LOG_FILE,
    },
    cache: {
      enabled: process.env.CACHE_ENABLED === 'true',
      ttl: parseInt(process.env.CACHE_TTL || '3600', 10), // 1 hour
    },
  };
}

/**
 * Get default configuration
 */
export function getDefaultConfig(): Config {
  return loadConfig();
}

/**
 * Validate configuration
 */
export function validateConfig(config: Config): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (config.server.port < 1 || config.server.port > 65535) {
    errors.push('Server port must be between 1 and 65535');
  }

  if (config.analysis.timeout < 1000) {
    errors.push('Analysis timeout must be at least 1000ms');
  }

  if (config.analysis.maxFileSize < 1024) {
    errors.push('Max file size must be at least 1KB');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

