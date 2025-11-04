'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Step1Identity from '@/components/onboarding/Step1Identity'
import Step2TasteDevelopment from '@/components/onboarding/Step2TasteDevelopment'
import Step3CuratorChoice from '@/components/onboarding/Step3CuratorChoice'
import Step4CurationStatement from '@/components/onboarding/Step4CurationStatement'
import Step5RecommendedCurators from '@/components/onboarding/Step5RecommendedCurators'

interface OnboardingData {
  username: string
  display_name: string
  bio: string
  selectedGenres: string[]
  discoveryPreferences: string[]
  favoriteArtists: string[]
  isCurator: boolean
  curationStatement: string
}

export default function OnboardingPage() {
  const [step, setStep] = useState(1)
  const [userId, setUserId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [savingProfile, setSavingProfile] = useState(false)

  const [data, setData] = useState<OnboardingData>({
    username: '',
    display_name: '',
    bio: '',
    selectedGenres: [],
    discoveryPreferences: [],
    favoriteArtists: [],
    isCurator: true,
    curationStatement: '',
  })

  useEffect(() => {
    // Get current user
    const getCurrentUser = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
      }
    }
    getCurrentUser()
  }, [])

  const updateData = (updates: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...updates }))
  }

  const nextStep = () => {
    setStep((prev) => prev + 1)
  }

  const prevStep = () => {
    setStep((prev) => prev - 1)
  }

  const handleStepTransition = async (fromStep: number) => {
    // If moving from step 3 to 4/5, check if we need to skip step 4
    if (fromStep === 3) {
      if (data.isCurator) {
        setStep(4) // Go to curation statement
      } else {
        // Listener: skip curation statement, save profile, go to recommendations
        await saveProfile()
      }
    }
    // If moving from step 4 (curation statement), save profile then go to step 5
    else if (fromStep === 4) {
      await saveProfile()
    }
    else {
      nextStep()
    }
  }

  const saveProfile = async () => {
    if (!userId) {
      setError('Not authenticated')
      return
    }

    setSavingProfile(true)
    setError(null)

    try {
      const supabase = createClient()

      // Create profile
      const { error: profileError } = await supabase.from('profiles').insert({
        id: userId,
        username: data.username.toLowerCase().trim(),
        display_name: data.display_name.trim() || data.username,
        bio: data.bio.trim() || null,
        curation_statement: data.curationStatement.trim() || null,
        genre_preferences: data.selectedGenres,
        is_curator: data.isCurator,
        discovery_preferences: data.discoveryPreferences,
        favorite_artists: data.favoriteArtists,
        onboarded: true,
      })

      if (profileError) {
        throw profileError
      }

      // Insert taste profile (all selected genres with default 'discovering' level)
      if (data.selectedGenres.length > 0) {
        const tasteProfileEntries = data.selectedGenres.map(genre => ({
          user_id: userId,
          genre: genre,
          experience_level: 'discovering' // Default level, will be updated automatically as user creates drops
        }))

        const { error: tasteError } = await supabase
          .from('taste_profile')
          .insert(tasteProfileEntries)

        if (tasteError) {
          console.error('Taste profile error:', tasteError)
          // Don't throw - profile is already created
        }
      }

      // Move to recommendations step
      setStep(5)
    } catch (err: any) {
      if (err.code === '23505') {
        setError('Username already taken. Please choose another.')
        setStep(1) // Go back to step 1
      } else {
        setError(err instanceof Error ? err.message : 'An error occurred')
      }
    } finally {
      setSavingProfile(false)
    }
  }

  const getTotalSteps = () => {
    return data.isCurator ? 5 : 4 // Listeners skip curation statement
  }

  const getDisplayStep = () => {
    // Adjust displayed step number if listener (since they skip step 4)
    if (!data.isCurator && step === 5) {
      return 4
    }
    return step
  }

  return (
    <div className="min-h-screen bg-gray-900 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Progress indicator */}
        {step < 5 && (
          <div className="mb-8">
            <div className="flex justify-between items-center mb-2">
              {Array.from({ length: getTotalSteps() }).map((_, i) => {
                const stepNum = i + 1
                const displayStep = getDisplayStep()

                return (
                  <div
                    key={stepNum}
                    className={`w-12 h-12 rounded-full flex items-center justify-center font-semibold ${
                      stepNum === displayStep
                        ? 'bg-purple-600 text-white'
                        : stepNum < displayStep
                        ? 'bg-purple-900 text-purple-300'
                        : 'bg-gray-800 text-gray-500'
                    }`}
                  >
                    {stepNum}
                  </div>
                )
              })}
            </div>
            <div className="text-center text-sm text-gray-400">
              Step {getDisplayStep()} of {getTotalSteps()}
            </div>
          </div>
        )}

        {/* Error display */}
        {error && (
          <div className="bg-red-900/20 border border-red-500 rounded-lg p-4 text-red-400 text-sm mb-6">
            {error}
          </div>
        )}

        {/* Loading state when saving */}
        {savingProfile && (
          <div className="bg-gray-800 rounded-lg p-8">
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mb-4"></div>
              <p className="text-gray-400">Creating your profile...</p>
            </div>
          </div>
        )}

        {/* Step content */}
        {!savingProfile && (
          <>
            {step === 1 && (
              <Step1Identity
                data={data}
                updateData={updateData}
                onNext={nextStep}
              />
            )}

            {step === 2 && (
              <Step2TasteDevelopment
                data={data}
                updateData={updateData}
                onNext={nextStep}
                onBack={prevStep}
              />
            )}

            {step === 3 && (
              <Step3CuratorChoice
                data={data}
                updateData={updateData}
                onNext={() => handleStepTransition(3)}
                onBack={prevStep}
              />
            )}

            {step === 4 && data.isCurator && (
              <Step4CurationStatement
                data={data}
                updateData={updateData}
                onNext={() => handleStepTransition(4)}
                onBack={prevStep}
              />
            )}

            {step === 5 && userId && (
              <Step5RecommendedCurators
                data={data}
                userId={userId}
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}
