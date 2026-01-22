export enum ErrorCode {
  API_KEY_INVALID = "API_KEY_INVALID",
  API_KEY_MISSING = "API_KEY_MISSING",
  API_KEY_VERIFICATION_FAILED = "API_KEY_VERIFICATION_FAILED",
  NETWORK_ERROR = "NETWORK_ERROR",
  QUOTA_EXCEEDED = "QUOTA_EXCEEDED",
  VALIDATION_ERROR = "VALIDATION_ERROR",
  STORAGE_ERROR = "STORAGE_ERROR",
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
}

export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public readonly timestamp: number = Date.now()
  ) {
    super(message)
    this.name = ErrorCode[code]
    Error.captureStackTrace(this, AppError)
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      timestamp: this.timestamp,
      stack: this.stack,
    }
  }
}

export interface ErrorContext {
  action?: string
  component?: string
  details?: Record<string, any>
}

export function createError(
  code: ErrorCode,
  message: string,
  context?: ErrorContext
): AppError {
  const error = new AppError(code, message)
  if (context) {
    const contextStr = Object.entries(context)
      .filter(([_, value]) => value !== undefined)
      .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
      .join(", ")
    error.message = `${message} (${contextStr})`
  }
  return error
}

export function isQuotaError(error: Error | AppError): boolean {
  return error instanceof AppError && error.code === ErrorCode.QUOTA_EXCEEDED
}

export function isAuthError(error: Error | AppError): boolean {
  return (
    error instanceof AppError &&
    (error.code === ErrorCode.API_KEY_INVALID ||
      error.code === ErrorCode.API_KEY_MISSING ||
      error.code === ErrorCode.API_KEY_VERIFICATION_FAILED)
  )
}

export function isNetworkError(error: Error | AppError): boolean {
  return error instanceof AppError && error.code === ErrorCode.NETWORK_ERROR
}

export function isValidationError(error: Error | AppError): boolean {
  return error instanceof AppError && error.code === ErrorCode.VALIDATION_ERROR
}
