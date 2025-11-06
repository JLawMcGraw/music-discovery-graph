import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * CSRF Protection Middleware
 *
 * Verifies that state-changing requests (POST, PUT, DELETE, PATCH) come from
 * the same origin to prevent Cross-Site Request Forgery attacks.
 *
 * Security:
 * - Checks Origin header matches Host header
 * - Only applies to state-changing operations
 * - Allows GET/HEAD/OPTIONS (safe methods)
 * - Returns 403 for invalid origins
 */
export function middleware(request: NextRequest) {
  // Only check state-changing methods
  const statefulMethods = ['POST', 'PUT', 'DELETE', 'PATCH']

  if (!statefulMethods.includes(request.method)) {
    return NextResponse.next()
  }

  // Get origin and host
  const origin = request.headers.get('origin')
  const host = request.headers.get('host')

  // Allow requests without origin header (e.g., same-origin navigation, curl)
  // These will be rejected by browser's same-origin policy if they're CSRF attempts
  if (!origin) {
    return NextResponse.next()
  }

  // Extract hostname from origin (remove protocol)
  const originHost = new URL(origin).host

  // Verify origin matches host
  if (originHost !== host) {
    console.warn('[CSRF] Blocked cross-origin request:', {
      method: request.method,
      path: request.nextUrl.pathname,
      origin: originHost,
      host,
      ip: request.headers.get('x-forwarded-for') || 'unknown',
    })

    return NextResponse.json(
      {
        error: 'Forbidden',
        message: 'Cross-origin requests are not allowed for this operation'
      },
      { status: 403 }
    )
  }

  // Origin is valid, continue
  return NextResponse.next()
}

/**
 * Apply middleware to all API routes
 */
export const config = {
  matcher: '/api/:path*',
}
