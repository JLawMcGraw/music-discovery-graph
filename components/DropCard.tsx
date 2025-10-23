'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'

interface Drop {
  id: string
  track_name: string
  artist_name: string
  album_name: string | null
  album_art_url: string | null
  external_url: string
  preview_url: string | null
  context: string
  listening_notes: string | null
  reputation_stake: number
  genres: string[] | null
  mood_tags: string[] | null
  validation_score: number
  validation_count: number
  status: string
  created_at: string
  user_id: string
  profiles: {
    username: string
    avatar_url: string | null
    trust_score: number
  }
  drop_validations?: Array<{
    rating: number
    validator_id: string
  }>
}

interface DropCardProps {
  drop: Drop
  currentUserId?: string
  onValidate?: (dropId: string, rating: number) => void
}

export function DropCard({ drop, currentUserId, onValidate }: DropCardProps) {
  const [rating, setRating] = useState<number | null>(null)
  const [showValidation, setShowValidation] = useState(false)
  const [validating, setValidating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const userHasValidated = drop.drop_validations?.some(
    (v) => v.validator_id === currentUserId
  )
  const isOwnDrop = drop.user_id === currentUserId

  const handleValidate = async () => {
    if (!rating || !currentUserId) return

    setValidating(true)
    setError(null)

    try {
      const response = await fetch(`/api/drops/${drop.id}/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rating,
          listened: true,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to validate drop')
      }

      if (onValidate) {
        onValidate(drop.id, rating)
      }

      setShowValidation(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setValidating(false)
    }
  }

  const handlePlatformClick = async (platform: string) => {
    try {
      await fetch(`/api/drops/${drop.id}/click`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ platform }),
      })
    } catch (err) {
      // Silent fail for click tracking
      console.error('Click tracking error:', err)
    }

    // Open external URL
    window.open(drop.external_url, '_blank')
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) return 'just now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    return `${Math.floor(diffInSeconds / 86400)}d ago`
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6 space-y-4">
      {/* Header - User Info */}
      <div className="flex items-center justify-between">
        <Link
          href={`/profile/${drop.profiles.username}`}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          {drop.profiles.avatar_url ? (
            <Image
              src={drop.profiles.avatar_url}
              alt={drop.profiles.username}
              width={40}
              height={40}
              className="rounded-full"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white font-semibold">
              {drop.profiles.username[0].toUpperCase()}
            </div>
          )}
          <div>
            <div className="font-medium text-white">{drop.profiles.username}</div>
            <div className="text-sm text-gray-400">
              Trust: {drop.profiles.trust_score} • {formatTimeAgo(drop.created_at)}
            </div>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-purple-900/30 border border-purple-500 rounded-full text-sm text-purple-300">
            {drop.reputation_stake} pts staked
          </span>
        </div>
      </div>

      {/* Track Info */}
      <div className="flex gap-4">
        {drop.album_art_url && (
          <Image
            src={drop.album_art_url}
            alt={drop.album_name || drop.track_name}
            width={120}
            height={120}
            className="rounded-lg"
          />
        )}
        <div className="flex-1 min-w-0">
          <h3 className="text-xl font-semibold text-white mb-1">{drop.track_name}</h3>
          <p className="text-gray-400 mb-2">{drop.artist_name}</p>
          {drop.album_name && <p className="text-sm text-gray-500">{drop.album_name}</p>}

          <button
            onClick={() => handlePlatformClick('spotify')}
            className="mt-3 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors inline-flex items-center gap-2"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
            </svg>
            Listen on Spotify
          </button>
        </div>
      </div>

      {/* Context - The Innovation */}
      <div className="bg-gray-900 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-purple-400 mb-2">Why this matters:</h4>
        <p className="text-white leading-relaxed whitespace-pre-wrap">{drop.context}</p>

        {drop.listening_notes && (
          <div className="mt-4">
            <h4 className="text-sm font-semibold text-purple-400 mb-2">What to listen for:</h4>
            <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">
              {drop.listening_notes}
            </p>
          </div>
        )}
      </div>

      {/* Tags */}
      {(drop.genres || drop.mood_tags) && (
        <div className="flex flex-wrap gap-2">
          {drop.genres?.map((genre) => (
            <span
              key={genre}
              className="px-3 py-1 bg-gray-700 text-gray-300 text-sm rounded-full"
            >
              {genre}
            </span>
          ))}
          {drop.mood_tags?.map((mood) => (
            <span
              key={mood}
              className="px-3 py-1 bg-purple-900/20 text-purple-300 text-sm rounded-full"
            >
              {mood}
            </span>
          ))}
        </div>
      )}

      {/* Validation Stats */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-700">
        <div className="flex items-center gap-4 text-sm text-gray-400">
          <span>{drop.validation_count} validations</span>
          {drop.validation_count > 0 && (
            <span className="flex items-center gap-1">
              <span className="text-yellow-400">★</span>
              {(drop.validation_score * 5).toFixed(1)}/5.0
            </span>
          )}
        </div>

        {/* Validation Button */}
        {currentUserId && !isOwnDrop && !userHasValidated && drop.status === 'active' && (
          <button
            onClick={() => setShowValidation(!showValidation)}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Validate
          </button>
        )}

        {userHasValidated && (
          <span className="text-sm text-green-400">✓ You validated this</span>
        )}

        {isOwnDrop && (
          <span className="text-sm text-gray-500">Your drop</span>
        )}
      </div>

      {/* Validation UI */}
      {showValidation && (
        <div className="bg-gray-900 rounded-lg p-4 space-y-4">
          <h4 className="text-white font-medium">Rate this recommendation:</h4>

          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star)}
                className={`text-3xl transition-all ${
                  rating && star <= rating ? 'text-yellow-400' : 'text-gray-600 hover:text-gray-400'
                }`}
              >
                ★
              </button>
            ))}
          </div>

          <div className="text-sm text-gray-400">
            {rating === 5 && '🔥 Amazing recommendation!'}
            {rating === 4 && '👍 Great find'}
            {rating === 3 && '👌 Decent recommendation'}
            {rating === 2 && '😐 Not my thing'}
            {rating === 1 && '👎 Poor recommendation'}
          </div>

          {error && <div className="text-sm text-red-400">{error}</div>}

          <div className="flex gap-2">
            <button
              onClick={handleValidate}
              disabled={!rating || validating}
              className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 text-white font-medium rounded-lg transition-colors disabled:cursor-not-allowed"
            >
              {validating ? 'Submitting...' : 'Submit Rating'}
            </button>
            <button
              onClick={() => {
                setShowValidation(false)
                setRating(null)
                setError(null)
              }}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
