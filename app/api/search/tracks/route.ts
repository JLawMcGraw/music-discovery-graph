import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { sanitizeSearchQuery } from '@/lib/validation'

// Spotify access token cache (valid for 1 hour)
let cachedToken: { token: string; expiresAt: number } | null = null

async function getSpotifyAccessToken(): Promise<string> {
  // Return cached token if still valid
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token
  }

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(
        `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
      ).toString('base64')}`,
    },
    body: 'grant_type=client_credentials',
  })

  if (!response.ok) {
    throw new Error('Failed to get Spotify access token')
  }

  const data = await response.json()

  // Cache token (expires in 1 hour, we refresh at 55 minutes)
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + 55 * 60 * 1000,
  }

  return data.access_token
}

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 2
): Promise<Response> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options)

      // Retry on 5xx errors and 429 (rate limit)
      if (response.status >= 500 || response.status === 429) {
        if (attempt < maxRetries - 1) {
          await new Promise((resolve) => setTimeout(resolve, 500 * Math.pow(2, attempt)))
          continue
        }
      }

      return response
    } catch (error) {
      lastError = error as Error
      if (attempt < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500 * Math.pow(2, attempt)))
      }
    }
  }

  throw lastError || new Error('Request failed')
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const rawQuery = searchParams.get('q')

    // Get client IP for rate limiting (fallback to a default for local dev)
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'anonymous'

    // Rate limiting: 30 searches per minute per IP
    const rateLimit = checkRateLimit(
      `search:${ip}`,
      RATE_LIMITS.SEARCH_TRACKS.limit,
      RATE_LIMITS.SEARCH_TRACKS.window
    )

    if (!rateLimit.success) {
      return NextResponse.json(
        {
          error: 'Too many requests',
          retryAfter: rateLimit.retryAfter,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimit.retryAfter),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Math.floor(rateLimit.resetTime / 1000)),
          },
        }
      )
    }

    // Validate and sanitize input
    if (!rawQuery) {
      return NextResponse.json(
        { error: 'Query parameter "q" is required' },
        { status: 400 }
      )
    }

    const query = sanitizeSearchQuery(rawQuery)

    // Get Spotify access token (with caching)
    const accessToken = await getSpotifyAccessToken()

    // Search with retry logic
    const response = await fetchWithRetry(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=10`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error?.message || 'Spotify API error')
    }

    // Transform to simpler format
    const tracks = data.tracks.items.map((track: any) => ({
      id: track.id,
      name: track.name,
      artists: track.artists.map((a: any) => a.name),
      album: track.album.name,
      albumArt: track.album.images[0]?.url || null,
      previewUrl: track.preview_url,
      externalUrl: track.external_urls.spotify,
      durationMs: track.duration_ms,
      spotifyUri: track.uri,
    }))

    return NextResponse.json(
      { tracks },
      {
        headers: {
          'X-RateLimit-Remaining': String(rateLimit.remaining),
          'X-RateLimit-Reset': String(Math.floor(rateLimit.resetTime / 1000)),
        },
      }
    )
  } catch (error) {
    // Handle validation errors
    if (error instanceof Error && error.message.includes('Query')) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    console.error('Track search error:', error)
    return NextResponse.json({ error: 'Failed to search tracks' }, { status: 500 })
  }
}
