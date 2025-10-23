import { NextRequest, NextResponse } from 'next/server'

// Spotify public search - no user OAuth needed
async function getSpotifyAccessToken() {
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

  const data = await response.json()
  return data.access_token
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get('q')

  if (!query || query.length < 2) {
    return NextResponse.json(
      { error: 'Query must be at least 2 characters' },
      { status: 400 }
    )
  }

  try {
    const accessToken = await getSpotifyAccessToken()

    const response = await fetch(
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

    return NextResponse.json({ tracks })
  } catch (error) {
    console.error('Track search error:', error)
    return NextResponse.json(
      { error: 'Failed to search tracks' },
      { status: 500 }
    )
  }
}
