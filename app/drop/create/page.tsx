'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { TrackSearch, Track } from '@/components/TrackSearch'
import Image from 'next/image'

export default function CreateDropPage() {
  const router = useRouter()
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null)
  const [context, setContext] = useState('')
  const [listeningNotes, setListeningNotes] = useState('')
  const [reputationStake, setReputationStake] = useState(25)
  const [genres, setGenres] = useState('')
  const [moods, setMoods] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
          reputation_stake: reputationStake,
          genres: genres ? genres.split(',').map(g => g.trim()) : undefined,
          mood_tags: moods ? moods.split(',').map(m => m.trim()) : undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create drop')
      }

      // Redirect to feed or drop page
      router.push('/feed')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
          Create a Drop
        </h1>
        <p className="text-gray-400 mb-8">
          Stake your reputation on a track you believe in. Write context that helps others understand why it matters.
        </p>

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
                  placeholder="Why does this track matter? What makes it special? When should someone listen to it?"
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

          {/* Reputation Stake */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4 text-white">4. Stake Your Reputation</h2>
            <p className="text-sm text-gray-400 mb-4">
              Higher stakes show confidence. If your drop is validated well, you'll earn bonus reputation.
            </p>
            <div>
              <label htmlFor="stake" className="block text-sm font-medium text-gray-300 mb-2">
                Stake: {reputationStake} points
              </label>
              <input
                id="stake"
                type="range"
                min="10"
                max="100"
                step="5"
                value={reputationStake}
                onChange={(e) => setReputationStake(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>10 (low risk)</span>
                <span>100 (high confidence)</span>
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
            {loading ? 'Creating Drop...' : 'Create Drop'}
          </button>
        </form>
      </div>
    </div>
  )
}
