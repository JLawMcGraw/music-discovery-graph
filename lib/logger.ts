/**
 * Centralized logging utility
 *
 * In production, integrate with:
 * - Sentry: https://sentry.io
 * - LogRocket: https://logrocket.com
 * - Datadog: https://www.datadoghq.com
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal'

export interface LogContext {
  userId?: string
  sessionId?: string
  endpoint?: string
  method?: string
  statusCode?: number
  duration?: number
  error?: Error
  metadata?: Record<string, any>
}

interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  context: LogContext
  stack?: string
  environment: string
}

/**
 * Format log entry as structured JSON
 */
function formatLogEntry(
  level: LogLevel,
  message: string,
  context: LogContext
): LogEntry {
  return {
    timestamp: new Date().toISOString(),
    level,
    message,
    context,
    stack: context.error?.stack,
    environment: process.env.NODE_ENV || 'development',
  }
}

/**
 * Send log to external service (placeholder for production integration)
 */
async function sendToExternalService(entry: LogEntry): Promise<void> {
  // TODO: Integrate with Sentry/LogRocket in production
  // Example Sentry integration:
  //
  // if (process.env.NODE_ENV === 'production' && process.env.SENTRY_DSN) {
  //   import('@sentry/nextjs').then(Sentry => {
  //     if (entry.level === 'error' || entry.level === 'fatal') {
  //       Sentry.captureException(entry.context.error || new Error(entry.message), {
  //         level: entry.level,
  //         contexts: {
  //           custom: entry.context,
  //         },
  //       })
  //     } else {
  //       Sentry.captureMessage(entry.message, {
  //         level: entry.level as any,
  //         contexts: {
  //           custom: entry.context,
  //         },
  //       })
  //     }
  //   })
  // }
}

/**
 * Core logging function
 */
function log(level: LogLevel, message: string, context: LogContext = {}): void {
  const entry = formatLogEntry(level, message, context)

  // Console output (development)
  const consoleMethod = level === 'fatal' || level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'
  console[consoleMethod](JSON.stringify(entry, null, process.env.NODE_ENV === 'development' ? 2 : 0))

  // Send to external service (production)
  if (process.env.NODE_ENV === 'production' || level === 'error' || level === 'fatal') {
    sendToExternalService(entry).catch((err) => {
      console.error('Failed to send log to external service:', err)
    })
  }
}

/**
 * Log debug message (development only)
 */
export function logDebug(message: string, context?: LogContext): void {
  if (process.env.NODE_ENV === 'development') {
    log('debug', message, context)
  }
}

/**
 * Log informational message
 */
export function logInfo(message: string, context?: LogContext): void {
  log('info', message, context)
}

/**
 * Log warning
 */
export function logWarn(message: string, context?: LogContext): void {
  log('warn', message, context)
}

/**
 * Log error
 */
export function logError(message: string, context: LogContext): void {
  log('error', message, context)
}

/**
 * Log fatal error (application-level failure)
 */
export function logFatal(message: string, context: LogContext): void {
  log('fatal', message, context)
}

/**
 * Log API request/response
 */
export function logAPIRequest(
  endpoint: string,
  method: string,
  statusCode: number,
  duration: number,
  context: Partial<LogContext> = {}
): void {
  const level: LogLevel = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info'

  log(level, `API ${method} ${endpoint} - ${statusCode}`, {
    endpoint,
    method,
    statusCode,
    duration,
    ...context,
  })
}

/**
 * Express/Next.js middleware for logging requests
 */
export function createRequestLogger() {
  return async (req: Request, handler: () => Promise<Response>): Promise<Response> => {
    const startTime = Date.now()
    const { pathname } = new URL(req.url)
    const method = req.method

    try {
      const response = await handler()
      const duration = Date.now() - startTime

      logAPIRequest(pathname, method, response.status, duration)

      return response
    } catch (error) {
      const duration = Date.now() - startTime

      logError(`API ${method} ${pathname} failed`, {
        endpoint: pathname,
        method,
        duration,
        error: error as Error,
      })

      throw error
    }
  }
}

/**
 * Helper to safely extract error message
 */
export function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  return 'Unknown error'
}

/**
 * Helper to safely extract error stack
 */
export function extractErrorStack(error: unknown): string | undefined {
  if (error instanceof Error) {
    return error.stack
  }
  return undefined
}
