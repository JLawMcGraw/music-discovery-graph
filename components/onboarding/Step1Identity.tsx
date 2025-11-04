'use client'

import { useState } from 'react'

interface OnboardingData {
  username: string
  display_name: string
  bio: string
}

interface Step1Props {
  data: OnboardingData
  updateData: (updates: Partial<OnboardingData>) => void
  onNext: () => void
}

export default function Step1Identity({ data, updateData, onNext }: Step1Props) {
  const [username, setUsername] = useState(data.username || '')
  const [displayName, setDisplayName] = useState(data.display_name || '')
  const [bio, setBio] = useState(data.bio || '')

  const handleNext = () => {
    updateData({
      username: username.toLowerCase().trim(),
      display_name: displayName.trim() || username,
      bio: bio.trim(),
    })
    onNext()
  }

  return (
    <div className="space-y-6 bg-gray-800 p-8 rounded-lg">
      <div>
        <h2 className="text-3xl font-bold mb-2 text-white">Choose Your Identity</h2>
        <p className="text-gray-400">This is how others will recognize you on DeepCuts.</p>
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

      <button
        onClick={handleNext}
        disabled={!username || username.length < 3}
        className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-700 disabled:to-gray-700 text-white font-semibold rounded-lg transition-all disabled:cursor-not-allowed"
      >
        Continue
      </button>
    </div>
  )
}
