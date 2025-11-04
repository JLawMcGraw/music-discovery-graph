'use client'

import { useState } from 'react'

const AVAILABLE_GENRES = [
  'Indie', 'Rock', 'Electronic', 'Hip Hop', 'Jazz', 'Classical',
  'Folk', 'Metal', 'R&B', 'Soul', 'Funk', 'Reggae', 'Pop',
  'Country', 'Blues', 'Punk', 'Alternative', 'Ambient'
]

const DISCOVERY_PREFERENCES = [
  { value: 'new_releases', label: 'New Releases', description: 'Just dropped' },
  { value: 'deep_cuts', label: 'Deep Cuts', description: 'Hidden gems' },
  { value: 'classics', label: 'Classics', description: 'Timeless tracks' },
  { value: 'experimental', label: 'Experimental', description: 'Pushing boundaries' },
  { value: 'lyrical', label: 'Lyrical', description: 'Focus on words' },
  { value: 'production', label: 'Production', description: 'Sound design' },
]

interface Step2Props {
  data: any
  updateData: (updates: any) => void
  onNext: () => void
  onBack: () => void
}

export default function Step2TasteDevelopment({
  data,
  updateData,
  onNext,
  onBack,
}: Step2Props) {
  const [selectedGenres, setSelectedGenres] = useState<string[]>(
    data.selectedGenres || []
  )
  const [discoveryPrefs, setDiscoveryPrefs] = useState<string[]>(
    data.discoveryPreferences || []
  )
  const [artists, setArtists] = useState<string[]>(
    data.favoriteArtists || ['', '', '']
  )

  const toggleGenre = (genre: string) => {
    if (selectedGenres.includes(genre)) {
      setSelectedGenres(selectedGenres.filter((g) => g !== genre))
    } else if (selectedGenres.length < 10) {
      setSelectedGenres([...selectedGenres, genre])
    }
  }

  const togglePref = (pref: string) => {
    if (discoveryPrefs.includes(pref)) {
      setDiscoveryPrefs(discoveryPrefs.filter((p) => p !== pref))
    } else {
      setDiscoveryPrefs([...discoveryPrefs, pref])
    }
  }

  const handleNext = () => {
    // Validate: at least 3 genres
    if (selectedGenres.length < 3) {
      alert('Please select at least 3 genres')
      return
    }

    updateData({
      selectedGenres,
      discoveryPreferences: discoveryPrefs,
      favoriteArtists: artists.filter((a) => a.trim().length > 0),
    })
    onNext()
  }

  return (
    <div className="bg-gray-800 rounded-lg p-8">
      <h2 className="text-2xl font-bold text-white mb-2">
        Let's understand your music taste
      </h2>
      <p className="text-gray-400 mb-6">
        This helps us recommend curators who match your taste
      </p>

      {/* Genre Selection */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-white mb-3">
          Select 3-10 genres you love
        </h3>
        <div className="flex flex-wrap gap-2 mb-4">
          {AVAILABLE_GENRES.map((genre) => (
            <button
              key={genre}
              onClick={() => toggleGenre(genre)}
              disabled={selectedGenres.length >= 10 && !selectedGenres.includes(genre)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedGenres.includes(genre)
                  ? 'bg-purple-600 text-white'
                  : selectedGenres.length >= 10
                  ? 'bg-gray-900 text-gray-600 cursor-not-allowed'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {genre}
            </button>
          ))}
        </div>
        <p className="text-sm text-gray-400">
          {selectedGenres.length}/10 genres selected (minimum 3)
        </p>
      </div>

      {/* Discovery Preferences */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-white mb-3">
          What are you looking for? (optional)
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {DISCOVERY_PREFERENCES.map((pref) => (
            <button
              key={pref.value}
              onClick={() => togglePref(pref.value)}
              className={`p-4 rounded-lg text-left transition-colors ${
                discoveryPrefs.includes(pref.value)
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-900 text-gray-300 hover:bg-gray-700'
              }`}
            >
              <div className="font-semibold">{pref.label}</div>
              <div className="text-sm opacity-80">{pref.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Favorite Artists */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-white mb-3">
          Name 3-5 artists you've been obsessed with lately (optional)
        </h3>
        <div className="space-y-2">
          {artists.map((artist, index) => (
            <input
              key={index}
              type="text"
              value={artist}
              onChange={(e) => {
                const newArtists = [...artists]
                newArtists[index] = e.target.value
                setArtists(newArtists)
              }}
              placeholder={`Artist ${index + 1}`}
              className="w-full px-4 py-2 bg-gray-900 text-white rounded-lg border border-gray-700 focus:border-purple-500 focus:outline-none"
            />
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors"
        >
          Back
        </button>
        <button
          onClick={handleNext}
          className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors"
        >
          Next
        </button>
      </div>
    </div>
  )
}
