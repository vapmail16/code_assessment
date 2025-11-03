/**
 * Structured logging utility
 */

import * as winston from 'winston';

export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

export interface Logger {
  error(message: string, meta?: Record<string, any>): void;
  warn(message: string, meta?: Record<string, any>): void;
  info(message: string, meta?: Record<string, any>): void;
  debug(message: string, meta?: Record<string, any>): void;
}

/**
 * Create logger instance
 */
export function createLogger(options?: {
  level?: LogLevel;
  format?: 'json' | 'text';
  filename?: string;
}): Logger {
  const level = options?.level || (process.env.LOG_LEVEL as LogLevel) || 'info';
  const format = options?.format || (process.env.LOG_FORMAT === 'json' ? 'json' : 'text');

  const transports: winston.transport[] = [
    new winston.transports.Console({
      format:
        format === 'json'
          ? winston.format.json()
          : winston.format.combine(
              winston.format.colorize(),
              winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
              winston.format.printf(({ timestamp, level, message, ...meta }) => {
                const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
                return `${timestamp} [${level}]: ${message} ${metaStr}`;
              })
            ),
    }),
  ];

  if (options?.filename) {
    transports.push(
      new winston.transports.File({
        filename: options.filename,
        format: winston.format.json(),
      })
    );
  }

  const winstonLogger = winston.createLogger({
    level,
    transports,
    defaultMeta: {
      service: 'code-assessment',
    },
  });

  return {
    error: (message: string, meta?: Record<string, any>) => winstonLogger.error(message, meta),
    warn: (message: string, meta?: Record<string, any>) => winstonLogger.warn(message, meta),
    info: (message: string, meta?: Record<string, any>) => winstonLogger.info(message, meta),
    debug: (message: string, meta?: Record<string, any>) => winstonLogger.debug(message, meta),
  };
}

/**
 * Default logger instance
 */
export const logger = createLogger();

