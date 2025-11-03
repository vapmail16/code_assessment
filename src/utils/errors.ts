/**
 * Custom error classes
 */

export class AssessmentError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public context?: Record<string, any>
  ) {
    super(message);
    this.name = 'AssessmentError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export class GitHubError extends AssessmentError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'GITHUB_ERROR', 502, context);
    this.name = 'GitHubError';
  }
}

export class AnalysisError extends AssessmentError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'ANALYSIS_ERROR', 500, context);
    this.name = 'AnalysisError';
  }
}

export class ValidationError extends AssessmentError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'VALIDATION_ERROR', 400, context);
    this.name = 'ValidationError';
  }
}

/**
 * Format error for user-friendly display
 */
export function formatError(error: unknown): {
  message: string;
  code?: string;
  statusCode: number;
  context?: Record<string, any>;
} {
  if (error instanceof AssessmentError) {
    return {
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      context: error.context,
    };
  }

  if (error instanceof Error) {
    return {
      message: error.message || 'An unexpected error occurred',
      statusCode: 500,
    };
  }

  return {
    message: 'An unknown error occurred',
    statusCode: 500,
  };
}

