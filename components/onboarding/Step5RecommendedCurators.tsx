'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Curator {
  curator_id: string
  username: string
  display_name: string | null
  curation_statement: string | null
  avatar_url: string | null
  follower_count: number
  total_drops: number
  top_genres: string[] | null
  match_score: number
}

interface Step5Props {
  data: any
  userId: string
}

export default function Step5RecommendedCurators({ data, userId }: Step5Props) {
  const router = useRouter()
  const [curators, setCurators] = useState<Curator[]>([])
  const [loading, setLoading] = useState(true)
  const [completing, setCompleting] = useState(false)
  const [followedIds, setFollowedIds] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [followError, setFollowError] = useState<string | null>(null)

  useEffect(() => {
    fetchRecommendations()
  }, [])

  const fetchRecommendations = async () => {
    try {
      const supabase = createClient()

      // Call recommendation function
      const { data: recommendations, error: recError } = await supabase
        .rpc('recommend_curators_for_user', {
          target_user_id: userId,
          limit_count: 12
        })

      if (recError) {
        console.error('Recommendation error:', recError)
        setError('Failed to load recommendations')
      } else {
        setCurators(recommendations || [])
      }
    } catch (err) {
      console.error('Error fetching recommendations:', err)
      setError('An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleFollow = async (curatorId: string) => {
    try {
      setFollowError(null)
      const supabase = createClient()

      if (followedIds.has(curatorId)) {
        // Unfollow
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', userId)
          .eq('following_id', curatorId)

        if (error) throw error

        setFollowedIds(prev => {
          const newSet = new Set(prev)
          newSet.delete(curatorId)
          return newSet
        })
      } else {
        // Follow
        const { error } = await supabase
          .from('follows')
          .insert({
            follower_id: userId,
            following_id: curatorId
          })

        if (error) throw error

        setFollowedIds(prev => new Set(prev).add(curatorId))
      }
    } catch (err) {
      console.error('Follow error:', err)
      setFollowError('Failed to update follow status. Please try again.')
      // Auto-dismiss error after 5 seconds
      setTimeout(() => setFollowError(null), 5000)
    }
  }

  const handleComplete = () => {
    setCompleting(true)
    // Navigate to feed
    router.push('/feed')
  }

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-8">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-800 rounded-lg p-8">
      <h2 className="text-2xl font-bold text-white mb-2">
        Curators We Think You'll Love
      </h2>
      <p className="text-gray-400 mb-6">
        Based on your taste, here are some curators to get you started. You can always discover more later.
      </p>

      {error && (
        <div className="bg-red-900/20 border border-red-500 rounded-lg p-4 text-red-400 text-sm mb-6">
          {error}
        </div>
      )}

      {followError && (
        <div className="bg-red-900/20 border border-red-500 rounded-lg p-4 text-red-400 text-sm mb-6">
          {followError}
        </div>
      )}

      {curators.length === 0 && !error && (
        <div className="bg-gray-900 rounded-lg p-8 text-center mb-6">
          <p className="text-gray-400">
            No recommendations yet. Start exploring curators in the Discover page!
          </p>
        </div>
      )}

      {curators.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {curators.map((curator) => (
            <div
              key={curator.curator_id}
              className="bg-gray-900 rounded-lg p-5 border border-gray-700 hover:border-gray-600 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white">
                    {curator.display_name || curator.username}
                  </h3>
                  <p className="text-sm text-gray-400">@{curator.username}</p>
                </div>
                <button
                  onClick={() => handleFollow(curator.curator_id)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    followedIds.has(curator.curator_id)
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      : 'bg-purple-600 text-white hover:bg-purple-700'
                  }`}
                >
                  {followedIds.has(curator.curator_id) ? 'Following' : 'Follow'}
                </button>
              </div>

              {curator.curation_statement && (
                <p className="text-sm text-gray-300 mb-3 line-clamp-2">
                  {curator.curation_statement}
                </p>
              )}

              <div className="flex items-center gap-4 text-xs text-gray-400">
                <span>{curator.follower_count} followers</span>
                <span>{curator.total_drops} drops</span>
              </div>

              {curator.top_genres && curator.top_genres.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3">
                  {curator.top_genres.slice(0, 3).map((genre) => (
                    <span
                      key={genre}
                      className="px-2 py-1 text-xs bg-purple-900/30 text-purple-300 rounded"
                    >
                      {genre}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Completion message */}
      <div className="bg-purple-900/20 border border-purple-500 rounded-lg p-4 mb-6">
        <p className="text-sm text-purple-300">
          {followedIds.size === 0
            ? "You can skip this step and discover curators later."
            : `Great! You're following ${followedIds.size} curator${followedIds.size > 1 ? 's' : ''}. You can always find more in the Discover page.`
          }
        </p>
      </div>

      {/* Complete button */}
      <button
        onClick={handleComplete}
        disabled={completing}
        className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-700 disabled:to-gray-700 text-white font-semibold rounded-lg transition-all disabled:cursor-not-allowed"
      >
        {completing ? 'Completing Setup...' : 'Complete Setup & Go to Feed'}
      </button>
    </div>
  )
}
