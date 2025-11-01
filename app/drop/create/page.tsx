'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { TrackSearch, Track } from '@/components/TrackSearch'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'

export default function CreateDropPage() {
  const router = useRouter()
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null)
  const [context, setContext] = useState('')
  const [listeningNotes, setListeningNotes] = useState('')
  const [genres, setGenres] = useState('')
  const [moods, setMoods] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [weeklyDropCount, setWeeklyDropCount] = useState<number | null>(null)
  const [nextReset, setNextReset] = useState<string | null>(null)

  useEffect(() => {
    // Fetch weekly drop count
    const fetchWeeklyCount = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        const { data, error } = await supabase.rpc('get_weekly_drop_count', {
          user_uuid: user.id
        })

        if (!error && data !== null) {
          setWeeklyDropCount(data)
        }

        // Get next reset time
        const { data: resetData } = await supabase.rpc('get_next_week_reset')
        if (resetData) {
          setNextReset(new Date(resetData).toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'short',
            day: 'numeric'
          }))
        }
      }
    }

    fetchWeeklyCount()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedTrack) {
      setError('Please select a track')
      return
    }

    if (context.length < 50) {
      setError('Context must be at least 50 characters')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/drops/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          track_id: selectedTrack.id,
          platform: 'spotify',
          track_name: selectedTrack.name,
          artist_name: selectedTrack.artists.join(', '),
          album_name: selectedTrack.album,
          album_art_url: selectedTrack.albumArt,
          external_url: selectedTrack.externalUrl,
          preview_url: selectedTrack.previewUrl,
          context,
          listening_notes: listeningNotes || undefined,
          genres: genres ? genres.split(',').map(g => g.trim()) : undefined,
          moods: moods ? moods.split(',').map(m => m.trim()) : undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to create drop')
      }

      // Redirect to feed
      router.push('/feed')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const dropsRemaining = weeklyDropCount !== null ? 10 - weeklyDropCount : null
  const canPost = dropsRemaining === null || dropsRemaining > 0

  return (
    <div className="min-h-screen bg-gray-900 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
            Create a Drop
          </h1>

          {weeklyDropCount !== null && (
            <div className="text-right">
              <div className="text-2xl font-bold text-white">
                {weeklyDropCount} / 10
              </div>
              <div className="text-sm text-gray-400">
                drops this week
              </div>
            </div>
          )}
        </div>

        <p className="text-gray-400 mb-2">
          Share up to 10 drops per week that define your taste. Choose tracks that truly matter to you.
        </p>

        {nextReset && (
          <p className="text-sm text-gray-500 mb-8">
            Resets {nextReset}
          </p>
        )}

        {!canPost ? (
          <div className="bg-gray-800 rounded-lg p-12 text-center">
            <div className="text-4xl mb-4">🎵</div>
            <h2 className="text-2xl font-semibold text-white mb-2">
              Weekly Limit Reached
            </h2>
            <p className="text-gray-400 mb-4">
              You've posted 10 drops this week. This limit helps you curate your best picks.
            </p>
            <p className="text-sm text-gray-500">
              Your limit resets {nextReset}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Track Selection */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4 text-white">1. Select a Track</h2>
              {!selectedTrack ? (
                <TrackSearch onSelectTrack={setSelectedTrack} />
              ) : (
                <div className="flex items-center gap-4 p-4 bg-gray-900 rounded-lg">
                  {selectedTrack.albumArt && (
                    <Image
                      src={selectedTrack.albumArt}
                      alt={selectedTrack.album}
                      width={80}
                      height={80}
                      className="rounded"
                    />
                  )}
                  <div className="flex-1">
                    <div className="font-semibold text-white">{selectedTrack.name}</div>
                    <div className="text-gray-400">{selectedTrack.artists.join(', ')}</div>
                    <div className="text-sm text-gray-500">{selectedTrack.album}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedTrack(null)}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                  >
                    Change
                  </button>
                </div>
              )}
            </div>

            {/* Context */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4 text-white">2. Explain Why It Matters</h2>
              <div className="space-y-4">
                <div>
                  <label htmlFor="context" className="block text-sm font-medium text-gray-300 mb-2">
                    Context <span className="text-red-400">*</span>
                    <span className="text-gray-500 ml-2">({context.length}/2000 chars, min 50)</span>
                  </label>
                  <textarea
                    id="context"
                    value={context}
                    onChange={(e) => setContext(e.target.value)}
                    rows={5}
                    placeholder="Why does this track matter to you? What makes it special? When should someone listen to it?"
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    maxLength={2000}
                    required
                  />
                  {context.length > 0 && context.length < 50 && (
                    <p className="text-sm text-red-400 mt-1">Need {50 - context.length} more characters</p>
                  )}
                </div>

                <div>
                  <label htmlFor="listening-notes" className="block text-sm font-medium text-gray-300 mb-2">
                    Listening Notes <span className="text-gray-500">(optional)</span>
                  </label>
                  <textarea
                    id="listening-notes"
                    value={listeningNotes}
                    onChange={(e) => setListeningNotes(e.target.value)}
                    rows={3}
                    placeholder="What should listeners pay attention to? Specific moments, instruments, lyrics?"
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    maxLength={1000}
                  />
                </div>
              </div>
            </div>

            {/* Tags */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4 text-white">3. Add Tags (Optional)</h2>
              <div className="space-y-4">
                <div>
                  <label htmlFor="genres" className="block text-sm font-medium text-gray-300 mb-2">
                    Genres
                  </label>
                  <input
                    id="genres"
                    type="text"
                    value={genres}
                    onChange={(e) => setGenres(e.target.value)}
                    placeholder="indie, dream-pop, bedroom-pop (comma separated)"
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label htmlFor="moods" className="block text-sm font-medium text-gray-300 mb-2">
                    Moods
                  </label>
                  <input
                    id="moods"
                    type="text"
                    value={moods}
                    onChange={(e) => setMoods(e.target.value)}
                    placeholder="melancholic, energetic, introspective (comma separated)"
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="bg-red-900/20 border border-red-500 rounded-lg p-4 text-red-400">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !selectedTrack || context.length < 50}
              className="w-full px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-700 disabled:to-gray-700 text-white font-semibold rounded-lg transition-all disabled:cursor-not-allowed"
            >
              {loading ? 'Creating Drop...' : 'Share Drop'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
