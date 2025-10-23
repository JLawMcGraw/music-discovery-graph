import SpotifyWebApi from 'spotify-web-api-node'

export function createSpotifyClient(accessToken?: string) {
  const client = new SpotifyWebApi({
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
    redirectUri: process.env.SPOTIFY_REDIRECT_URI,
  })

  if (accessToken) {
    client.setAccessToken(accessToken)
  }

  return client
}

export async function refreshSpotifyToken(refreshToken: string) {
  const client = createSpotifyClient()
  client.setRefreshToken(refreshToken)

  const data = await client.refreshAccessToken()
  return {
    accessToken: data.body.access_token,
    expiresIn: data.body.expires_in,
  }
}

export async function getSpotifyTrackDetails(trackId: string, accessToken: string) {
  const client = createSpotifyClient(accessToken)
  const track = await client.getTrack(trackId)

  return {
    id: track.body.id,
    name: track.body.name,
    artists: track.body.artists.map(a => a.name),
    album: track.body.album.name,
    albumArt: track.body.album.images[0]?.url,
    previewUrl: track.body.preview_url,
    spotifyUrl: track.body.external_urls.spotify,
    durationMs: track.body.duration_ms,
  }
}
