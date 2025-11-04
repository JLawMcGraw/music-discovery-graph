'use client'

import { useState } from 'react'

interface Step4Props {
  data: any
  updateData: (updates: any) => void
  onNext: () => void
  onBack: () => void
}

export default function Step4CurationStatement({
  data,
  updateData,
  onNext,
  onBack,
}: Step4Props) {
  const [curationStatement, setCurationStatement] = useState(data.curationStatement || '')

  const handleNext = () => {
    updateData({ curationStatement: curationStatement.trim() })
    onNext()
  }

  return (
    <div className="bg-gray-800 rounded-lg p-8">
      <h2 className="text-2xl font-bold text-white mb-2">How Do You Curate?</h2>
      <p className="text-gray-400 mb-6">
        Help others understand your approach to music discovery.
      </p>

      <div className="mb-8">
        <label htmlFor="curation-statement" className="block text-sm font-medium text-gray-300 mb-2">
          Curation Statement <span className="text-gray-500">(optional but recommended)</span>
          <span className="text-gray-500 ml-2">({curationStatement.length}/500)</span>
        </label>
        <textarea
          id="curation-statement"
          value={curationStatement}
          onChange={(e) => setCurationStatement(e.target.value)}
          rows={6}
          maxLength={500}
          className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
          placeholder="Examples:&#10;• I dig for rare soul and funk 45s from regional labels&#10;• I focus on contemporary classical music that pushes boundaries&#10;• I curate indie folk with literary lyrics and unusual instrumentation&#10;• I share 90s hip hop deep cuts and forgotten producers"
        />
        <p className="text-xs text-gray-500 mt-2">
          What makes your taste unique? What do you look for in music? This helps people decide if they should follow you.
        </p>
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
