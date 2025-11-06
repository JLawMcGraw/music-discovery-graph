/**
 * Environment Variable Validation
 *
 * Validates required environment variables at startup to prevent runtime errors.
 * Provides clear error messages for missing or invalid configuration.
 */

interface EnvConfig {
  // Spotify API
  SPOTIFY_CLIENT_ID: string
  SPOTIFY_CLIENT_SECRET: string

  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: string
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string

  // App Config
  NEXT_PUBLIC_APP_URL: string
  NODE_ENV: 'development' | 'production' | 'test'

  // Optional
  SENTRY_DSN?: string
  LOGROCKET_APP_ID?: string
}

/**
 * Validates that a required environment variable exists and is non-empty
 */
function validateRequired(key: string, value: string | undefined): string {
  if (!value || value.trim() === '') {
    throw new Error(
      `Missing required environment variable: ${key}\n` +
      `Please add it to your .env.local file.\n` +
      `See .env.example for reference.`
    )
  }
  return value.trim()
}

/**
 * Validates environment variable format
 */
function validateUrl(key: string, value: string): string {
  try {
    new URL(value)
    return value
  } catch {
    throw new Error(
      `Invalid URL format for ${key}: ${value}\n` +
      `Expected a valid URL (e.g., https://example.com)`
    )
  }
}

/**
 * Get and validate all environment variables
 *
 * @throws {Error} If any required environment variable is missing or invalid
 */
export function getEnv(): EnvConfig {
  const env = process.env

  // Validate required variables
  const SPOTIFY_CLIENT_ID = validateRequired('SPOTIFY_CLIENT_ID', env.SPOTIFY_CLIENT_ID)
  const SPOTIFY_CLIENT_SECRET = validateRequired('SPOTIFY_CLIENT_SECRET', env.SPOTIFY_CLIENT_SECRET)
  const NEXT_PUBLIC_SUPABASE_URL = validateUrl(
    'NEXT_PUBLIC_SUPABASE_URL',
    validateRequired('NEXT_PUBLIC_SUPABASE_URL', env.NEXT_PUBLIC_SUPABASE_URL)
  )
  const NEXT_PUBLIC_SUPABASE_ANON_KEY = validateRequired(
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
  const NEXT_PUBLIC_APP_URL = validateUrl(
    'NEXT_PUBLIC_APP_URL',
    env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  )

  // Validate NODE_ENV
  const NODE_ENV = env.NODE_ENV || 'development'
  if (!['development', 'production', 'test'].includes(NODE_ENV)) {
    throw new Error(`Invalid NODE_ENV: ${NODE_ENV}. Must be development, production, or test.`)
  }

  return {
    SPOTIFY_CLIENT_ID,
    SPOTIFY_CLIENT_SECRET,
    NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_URL,
    NODE_ENV: NODE_ENV as 'development' | 'production' | 'test',
    SENTRY_DSN: env.SENTRY_DSN,
    LOGROCKET_APP_ID: env.LOGROCKET_APP_ID,
  }
}

/**
 * Cached environment configuration
 * Validated once at module load time
 */
let cachedEnv: EnvConfig | null = null

/**
 * Get validated environment configuration
 *
 * @example
 * ```typescript
 * import { env } from '@/lib/env'
 *
 * const spotifyClientId = env().SPOTIFY_CLIENT_ID
 * ```
 */
export function env(): EnvConfig {
  if (!cachedEnv) {
    cachedEnv = getEnv()
  }
  return cachedEnv
}

/**
 * Check if running in production
 */
export function isProduction(): boolean {
  return env().NODE_ENV === 'production'
}

/**
 * Check if running in development
 */
export function isDevelopment(): boolean {
  return env().NODE_ENV === 'development'
}

/**
 * Check if running in test environment
 */
export function isTest(): boolean {
  return env().NODE_ENV === 'test'
}
