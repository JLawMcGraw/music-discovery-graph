'use client'

import { useState } from 'react'

interface Step3Props {
  data: any
  updateData: (updates: any) => void
  onNext: () => void
  onBack: () => void
}

export default function Step3CuratorChoice({
  data,
  updateData,
  onNext,
  onBack,
}: Step3Props) {
  const [isCurator, setIsCurator] = useState<boolean>(data.isCurator ?? true)

  const handleNext = () => {
    updateData({ isCurator })
    onNext()
  }

  return (
    <div className="bg-gray-800 rounded-lg p-8">
      <h2 className="text-2xl font-bold text-white mb-2">
        How do you want to use DeepCuts?
      </h2>
      <p className="text-gray-400 mb-8">
        Choose the role that best fits you. You can always change this later.
      </p>

      <div className="space-y-4 mb-8">
        {/* Curator Option */}
        <button
          onClick={() => setIsCurator(true)}
          className={`w-full p-6 rounded-lg text-left transition-all border-2 ${
            isCurator
              ? 'bg-purple-600 border-purple-400 text-white'
              : 'bg-gray-900 border-gray-700 text-gray-300 hover:border-gray-600'
          }`}
        >
          <div className="flex items-start gap-4">
            <div className="text-3xl">🎵</div>
            <div className="flex-1">
              <h3 className="text-xl font-bold mb-2">I want to curate music</h3>
              <p className="text-sm opacity-90">
                Share up to 10 tracks per week with context and curation. Build a following based on your taste and help others discover music.
              </p>
            </div>
            {isCurator && (
              <div className="text-2xl">✓</div>
            )}
          </div>
        </button>

        {/* Listener Option */}
        <button
          onClick={() => setIsCurator(false)}
          className={`w-full p-6 rounded-lg text-left transition-all border-2 ${
            !isCurator
              ? 'bg-purple-600 border-purple-400 text-white'
              : 'bg-gray-900 border-gray-700 text-gray-300 hover:border-gray-600'
          }`}
        >
          <div className="flex items-start gap-4">
            <div className="text-3xl">🎧</div>
            <div className="flex-1">
              <h3 className="text-xl font-bold mb-2">I just want to discover music</h3>
              <p className="text-sm opacity-90">
                Follow curators whose taste matches yours. Save drops you love and explore a personalized feed of music recommendations.
              </p>
            </div>
            {!isCurator && (
              <div className="text-2xl">✓</div>
            )}
          </div>
        </button>
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
