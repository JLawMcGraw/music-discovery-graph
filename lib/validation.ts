/**
 * Input validation and sanitization utilities
 */

// Maximum lengths to prevent abuse
export const MAX_QUERY_LENGTH = 200
export const MAX_USERNAME_LENGTH = 50
export const MAX_DISPLAY_NAME_LENGTH = 100
export const MAX_BIO_LENGTH = 500
export const MAX_CONTEXT_LENGTH = 2000

// Regex patterns for validation
const QUERY_PATTERN = /^[a-zA-Z0-9\s\-.,!?'"]+$/
const USERNAME_PATTERN = /^[a-z0-9_]+$/

/**
 * Sanitize search query input
 *
 * @param query - Raw search query from user
 * @returns Sanitized query string
 * @throws Error if query is invalid
 */
export function sanitizeSearchQuery(query: string): string {
  if (!query || typeof query !== 'string') {
    throw new Error('Query must be a non-empty string')
  }

  // Trim whitespace
  const trimmed = query.trim()

  // Check length
  if (trimmed.length < 2) {
    throw new Error('Query must be at least 2 characters')
  }

  if (trimmed.length > MAX_QUERY_LENGTH) {
    throw new Error(`Query too long (max ${MAX_QUERY_LENGTH} characters)`)
  }

  // Remove potentially dangerous characters
  // Allow: letters, numbers, spaces, common punctuation
  const sanitized = trimmed.replace(/[^\w\s\-.,!?'"]/g, '').trim()

  if (sanitized.length === 0) {
    throw new Error('Query contains only invalid characters')
  }

  return sanitized
}

/**
 * Validate username format
 *
 * @param username - Username to validate
 * @returns true if valid
 * @throws Error if invalid
 */
export function validateUsername(username: string): boolean {
  if (!username || typeof username !== 'string') {
    throw new Error('Username is required')
  }

  const trimmed = username.trim().toLowerCase()

  if (trimmed.length < 3) {
    throw new Error('Username must be at least 3 characters')
  }

  if (trimmed.length > MAX_USERNAME_LENGTH) {
    throw new Error(`Username too long (max ${MAX_USERNAME_LENGTH} characters)`)
  }

  if (!USERNAME_PATTERN.test(trimmed)) {
    throw new Error('Username can only contain lowercase letters, numbers, and underscores')
  }

  // Reserved usernames
  const reserved = ['admin', 'api', 'support', 'help', 'root', 'system', 'deepcuts']
  if (reserved.includes(trimmed)) {
    throw new Error('This username is reserved')
  }

  return true
}

/**
 * Sanitize text input (bio, context, etc.)
 *
 * @param text - Raw text input
 * @param maxLength - Maximum allowed length
 * @returns Sanitized text
 */
export function sanitizeText(text: string, maxLength: number = 500): string {
  if (!text || typeof text !== 'string') {
    return ''
  }

  // Trim whitespace
  let sanitized = text.trim()

  // Remove null bytes and other control characters (except newlines/tabs)
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')

  // Limit length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength)
  }

  return sanitized
}

/**
 * Validate and sanitize array input
 *
 * @param arr - Array to validate
 * @param options - Validation options
 * @returns Sanitized array
 */
export function sanitizeArray(
  arr: unknown,
  options: {
    maxLength?: number
    itemMaxLength?: number
    allowedPattern?: RegExp
  } = {}
): string[] {
  if (!Array.isArray(arr)) {
    return []
  }

  const { maxLength = 10, itemMaxLength = 100, allowedPattern } = options

  return arr
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter((item) => item.length > 0 && item.length <= itemMaxLength)
    .filter((item) => (allowedPattern ? allowedPattern.test(item) : true))
    .slice(0, maxLength)
}
