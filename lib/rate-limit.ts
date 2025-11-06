/**
 * Simple in-memory rate limiting for API routes
 *
 * PRODUCTION NOTE: For multi-server deployments, use Redis-based rate limiting
 * (e.g., @upstash/ratelimit with Vercel KV)
 */

interface RateLimitRecord {
  count: number
  resetTime: number
}

const rateLimitStore = new Map<string, RateLimitRecord>()

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(key)
    }
  }
}, 5 * 60 * 1000)

export interface RateLimitResult {
  success: boolean
  remaining: number
  resetTime: number
  retryAfter?: number
}

/**
 * Check if a request is within rate limits
 *
 * @param identifier - Unique identifier (e.g., user ID, IP address)
 * @param limit - Maximum number of requests allowed
 * @param windowMs - Time window in milliseconds (default: 60 seconds)
 * @returns Rate limit result with success status and remaining count
 */
export function checkRateLimit(
  identifier: string,
  limit: number = 60,
  windowMs: number = 60000
): RateLimitResult {
  const now = Date.now()
  const record = rateLimitStore.get(identifier)

  // No record or expired window - create new
  if (!record || now > record.resetTime) {
    const resetTime = now + windowMs
    rateLimitStore.set(identifier, { count: 1, resetTime })
    return {
      success: true,
      remaining: limit - 1,
      resetTime,
    }
  }

  // Check if limit exceeded
  if (record.count >= limit) {
    return {
      success: false,
      remaining: 0,
      resetTime: record.resetTime,
      retryAfter: Math.ceil((record.resetTime - now) / 1000), // seconds
    }
  }

  // Increment count
  record.count++
  rateLimitStore.set(identifier, record)

  return {
    success: true,
    remaining: limit - record.count,
    resetTime: record.resetTime,
  }
}

/**
 * Rate limit configurations for different endpoints
 */
export const RATE_LIMITS = {
  // Strict limits for resource-intensive operations
  DROP_CREATE: { limit: 20, window: 60000 }, // 20 requests per minute
  SEARCH_TRACKS: { limit: 30, window: 60000 }, // 30 searches per minute

  // Moderate limits for read operations
  FEED: { limit: 100, window: 60000 }, // 100 requests per minute

  // Relaxed limits for simple operations
  FOLLOW: { limit: 50, window: 60000 }, // 50 follows per minute
  SAVE_DROP: { limit: 50, window: 60000 }, // 50 saves per minute
}
