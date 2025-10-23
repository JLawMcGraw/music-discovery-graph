'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const GENRE_OPTIONS = [
  'Rock', 'Pop', 'Hip Hop', 'R&B', 'Electronic', 'Jazz', 'Classical',
  'Country', 'Folk', 'Metal', 'Punk', 'Indie', 'Alternative',
  'Soul', 'Funk', 'Reggae', 'Blues', 'Latin', 'K-Pop', 'J-Pop',
  'Lo-Fi', 'Ambient', 'House', 'Techno', 'Drum & Bass', 'Dubstep'
]

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Step 1: Username
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')

  // Step 2: Bio
  const [bio, setBio] = useState('')

  // Step 3: Genre Preferences
  const [selectedGenres, setSelectedGenres] = useState<string[]>([])

  const handleGenreToggle = (genre: string) => {
    if (selectedGenres.includes(genre)) {
      setSelectedGenres(selectedGenres.filter((g) => g !== genre))
    } else {
      if (selectedGenres.length < 5) {
        setSelectedGenres([...selectedGenres, genre])
      }
    }
  }

  const handleComplete = async () => {
    setError(null)
    setLoading(true)

    try {
      const supabase = createClient()

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        throw new Error('Not authenticated')
      }

      // Create profile
      const { error: profileError } = await supabase.from('profiles').insert({
        id: user.id,
        username: username.toLowerCase().trim(),
        display_name: displayName.trim() || username,
        bio: bio.trim() || null,
        genre_preferences: selectedGenres,
        onboarded: true,
      })

      if (profileError) {
        throw profileError
      }

      // Redirect to feed
      router.push('/feed')
    } catch (err: any) {
      if (err.code === '23505') {
        // Unique constraint violation
        setError('Username already taken. Please choose another.')
      } else {
        setError(err instanceof Error ? err.message : 'An error occurred')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Step {step} of 3</span>
            <span className="text-sm text-gray-400">{Math.round((step / 3) * 100)}%</span>
          </div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-600 to-pink-600 transition-all duration-300"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
        </div>

        {/* Step 1: Username */}
        {step === 1 && (
          <div className="space-y-6 bg-gray-800 p-8 rounded-lg">
            <div>
              <h2 className="text-3xl font-bold mb-2 text-white">Choose Your Identity</h2>
              <p className="text-gray-400">This is how others will recognize you on Signal.</p>
            </div>

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-2">
                Username <span className="text-red-400">*</span>
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/[^a-z0-9_]/g, ''))}
                pattern="[a-z0-9_]+"
                required
                maxLength={50}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="music_lover_23"
              />
              <p className="text-xs text-gray-500 mt-1">Lowercase letters, numbers, and underscores only</p>
            </div>

            <div>
              <label htmlFor="display-name" className="block text-sm font-medium text-gray-300 mb-2">
                Display Name <span className="text-gray-500">(optional)</span>
              </label>
              <input
                id="display-name"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={100}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Your Name"
              />
              <p className="text-xs text-gray-500 mt-1">A friendly name that appears alongside your username</p>
            </div>

            <button
              onClick={() => setStep(2)}
              disabled={!username || username.length < 3}
              className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-700 disabled:to-gray-700 text-white font-semibold rounded-lg transition-all disabled:cursor-not-allowed"
            >
              Continue
            </button>
          </div>
        )}

        {/* Step 2: Bio */}
        {step === 2 && (
          <div className="space-y-6 bg-gray-800 p-8 rounded-lg">
            <div>
              <h2 className="text-3xl font-bold mb-2 text-white">Tell Your Story</h2>
              <p className="text-gray-400">Share what makes your musical taste unique.</p>
            </div>

            <div>
              <label htmlFor="bio" className="block text-sm font-medium text-gray-300 mb-2">
                Bio <span className="text-gray-500">(optional)</span>
                <span className="text-gray-500 ml-2">({bio.length}/500)</span>
              </label>
              <textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={5}
                maxLength={500}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="I've been obsessed with music since I heard my first vinyl record at age 6. I dig deep for hidden gems in indie rock and dream pop..."
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors"
              >
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-lg transition-all"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Genre Preferences */}
        {step === 3 && (
          <div className="space-y-6 bg-gray-800 p-8 rounded-lg">
            <div>
              <h2 className="text-3xl font-bold mb-2 text-white">Pick Your Genres</h2>
              <p className="text-gray-400">
                Select up to 5 genres you're passionate about. This helps others discover your taste.
              </p>
              <p className="text-sm text-purple-400 mt-2">
                Selected: {selectedGenres.length}/5
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {GENRE_OPTIONS.map((genre) => {
                const isSelected = selectedGenres.includes(genre)
                const isDisabled = selectedGenres.length >= 5 && !isSelected

                return (
                  <button
                    key={genre}
                    onClick={() => handleGenreToggle(genre)}
                    disabled={isDisabled}
                    className={`px-4 py-3 rounded-lg font-medium transition-all ${
                      isSelected
                        ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                        : isDisabled
                        ? 'bg-gray-900 text-gray-600 cursor-not-allowed'
                        : 'bg-gray-900 text-gray-300 hover:bg-gray-850 border border-gray-700'
                    }`}
                  >
                    {genre}
                  </button>
                )
              })}
            </div>

            {error && (
              <div className="bg-red-900/20 border border-red-500 rounded-lg p-4 text-red-400 text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setStep(2)}
                disabled={loading}
                className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleComplete}
                disabled={loading || selectedGenres.length === 0}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-700 disabled:to-gray-700 text-white font-semibold rounded-lg transition-all disabled:cursor-not-allowed"
              >
                {loading ? 'Creating Profile...' : 'Complete Setup'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
