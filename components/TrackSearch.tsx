'use client'

import { useState } from 'react'
import Image from 'next/image'

export interface Track {
  id: string
  name: string
  artists: string[]
  album: string
  albumArt: string | null
  previewUrl: string | null
  externalUrl: string
  durationMs: number
  spotifyUri: string
}

interface TrackSearchProps {
  onSelectTrack: (track: Track) => void
}

export function TrackSearch({ onSelectTrack }: TrackSearchProps) {
  const [query, setQuery] = useState('')
  const [tracks, setTracks] = useState<Track[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const searchTracks = async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setTracks([])
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/search/tracks?q=${encodeURIComponent(searchQuery)}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to search tracks')
      }

      setTracks(data.tracks)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setTracks([])
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setQuery(value)

    // Debounce search
    const timeoutId = setTimeout(() => {
      searchTracks(value)
    }, 300)

    return () => clearTimeout(timeoutId)
  }

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="track-search" className="block text-sm font-medium text-gray-300 mb-2">
          Search for a track
        </label>
        <input
          id="track-search"
          type="text"
          value={query}
          onChange={handleInputChange}
          placeholder="Search by song title or artist..."
          className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
      </div>

      {loading && (
        <div className="text-center py-8 text-gray-400">Searching...</div>
      )}

      {error && (
        <div className="text-center py-8 text-red-400">{error}</div>
      )}

      {tracks.length > 0 && (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {tracks.map((track) => (
            <button
              key={track.id}
              onClick={() => onSelectTrack(track)}
              className="w-full flex items-center gap-4 p-3 bg-gray-800 hover:bg-gray-750 rounded-lg transition-colors text-left"
            >
              {track.albumArt && (
                <Image
                  src={track.albumArt}
                  alt={track.album}
                  width={48}
                  height={48}
                  className="rounded"
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-white truncate">{track.name}</div>
                <div className="text-sm text-gray-400 truncate">
                  {track.artists.join(', ')} • {track.album}
                </div>
              </div>
              <div className="text-sm text-gray-500">{formatDuration(track.durationMs)}</div>
            </button>
          ))}
        </div>
      )}

      {query.length >= 2 && tracks.length === 0 && !loading && !error && (
        <div className="text-center py-8 text-gray-400">No tracks found</div>
      )}
    </div>
  )
}
