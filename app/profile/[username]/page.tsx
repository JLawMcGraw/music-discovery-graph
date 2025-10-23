import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { DropCard } from '@/components/DropCard'
import Link from 'next/link'
import Image from 'next/image'

export const dynamic = 'force-dynamic'

interface Props {
  params: {
    username: string
  }
}

export default async function ProfilePage({ params }: Props) {
  const supabase = createClient()

  // Get current user
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser()

  // Fetch profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', params.username)
    .single()

  if (profileError || !profile) {
    notFound()
  }

  // Calculate success rate
  const successRate =
    profile.total_drops > 0
      ? Math.round((profile.successful_drops / profile.total_drops) * 100)
      : 0

  // Fetch user's drops
  const { data: drops } = await supabase
    .from('drops')
    .select(`
      *,
      profiles:user_id (
        username,
        avatar_url,
        trust_score
      ),
      drop_validations (
        rating,
        validator_id
      )
    `)
    .eq('user_id', profile.id)
    .order('created_at', { ascending: false })
    .limit(20)

  // Fetch reputation history
  const { data: reputationHistory } = await supabase
    .from('reputation_events')
    .select('*')
    .eq('user_id', profile.id)
    .order('created_at', { ascending: false })
    .limit(10)

  const isOwnProfile = currentUser?.id === profile.id

  return (
    <div className="min-h-screen bg-gray-900 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/feed"
            className="inline-flex items-center text-gray-400 hover:text-white mb-4"
          >
            ← Back to Feed
          </Link>

          <div className="bg-gray-800 rounded-lg p-8">
            <div className="flex items-start gap-6">
              {/* Avatar */}
              <div className="flex-shrink-0">
                {profile.avatar_url ? (
                  <Image
                    src={profile.avatar_url}
                    alt={profile.username}
                    width={120}
                    height={120}
                    className="rounded-full"
                  />
                ) : (
                  <div className="w-30 h-30 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center text-white text-4xl font-bold">
                    {profile.username[0].toUpperCase()}
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold text-white">{profile.display_name || profile.username}</h1>
                  {profile.tier === 'premium' && (
                    <span className="px-3 py-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-medium rounded-full">
                      Premium
                    </span>
                  )}
                </div>
                <p className="text-gray-400 mb-4">@{profile.username}</p>

                {profile.bio && (
                  <p className="text-gray-300 mb-4 leading-relaxed">{profile.bio}</p>
                )}

                {/* Genre Preferences */}
                {profile.genre_preferences && profile.genre_preferences.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {profile.genre_preferences.map((genre) => (
                      <span
                        key={genre}
                        className="px-3 py-1 bg-gray-900 text-gray-300 text-sm rounded-full border border-gray-700"
                      >
                        {genre}
                      </span>
                    ))}
                  </div>
                )}

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-2xl font-bold text-white">{profile.trust_score}</div>
                    <div className="text-sm text-gray-400">Trust Score</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-white">{profile.total_drops}</div>
                    <div className="text-sm text-gray-400">Total Drops</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-white">{successRate}%</div>
                    <div className="text-sm text-gray-400">Success Rate</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-white">{profile.reputation_available}</div>
                    <div className="text-sm text-gray-400">Available Rep</div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              {isOwnProfile && (
                <div>
                  <Link
                    href="/profile/edit"
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                  >
                    Edit Profile
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-2xl font-bold text-white">Drops</h2>

            {drops && drops.length > 0 ? (
              <div className="space-y-6">
                {drops.map((drop) => (
                  <DropCard key={drop.id} drop={drop} currentUserId={currentUser?.id} />
                ))}
              </div>
            ) : (
              <div className="bg-gray-800 rounded-lg p-12 text-center">
                <div className="text-4xl mb-4">🎵</div>
                <h3 className="text-xl font-semibold text-white mb-2">No drops yet</h3>
                <p className="text-gray-400 mb-4">
                  {isOwnProfile
                    ? "Time to stake your reputation on your first recommendation!"
                    : `${profile.username} hasn't made any drops yet.`}
                </p>
                {isOwnProfile && (
                  <Link
                    href="/drop/create"
                    className="inline-block px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-lg transition-all"
                  >
                    Create First Drop
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Reputation History */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-white mb-4">Reputation History</h3>

              {reputationHistory && reputationHistory.length > 0 ? (
                <div className="space-y-3">
                  {reputationHistory.map((event) => {
                    const isPositive = event.points_change > 0
                    const isNegative = event.points_change < 0

                    return (
                      <div
                        key={event.id}
                        className="flex items-start gap-3 pb-3 border-b border-gray-700 last:border-0"
                      >
                        <div className="flex-shrink-0">
                          {isPositive && <span className="text-green-400 text-xl">↗</span>}
                          {isNegative && <span className="text-red-400 text-xl">↘</span>}
                          {!isPositive && !isNegative && <span className="text-gray-400 text-xl">•</span>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-white">
                            {event.event_type === 'drop_created' && 'Drop Created'}
                            {event.event_type === 'drop_validated' && 'Drop Validated'}
                            {event.event_type === 'drop_failed' && 'Drop Failed'}
                            {event.event_type === 'manual_adjustment' && 'Manual Adjustment'}
                          </div>
                          <div
                            className={`text-sm font-medium ${
                              isPositive
                                ? 'text-green-400'
                                : isNegative
                                ? 'text-red-400'
                                : 'text-gray-400'
                            }`}
                          >
                            {isPositive && '+'}
                            {event.points_change} points
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(event.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-gray-400 text-sm">No reputation events yet</p>
              )}
            </div>

            {/* Stats Breakdown */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-white mb-4">Performance</h3>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-400">Success Rate</span>
                    <span className="text-white font-medium">{successRate}%</span>
                  </div>
                  <div className="h-2 bg-gray-900 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-green-600 to-emerald-600"
                      style={{ width: `${successRate}%` }}
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-700 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Successful Drops</span>
                    <span className="text-green-400 font-medium">{profile.successful_drops}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Failed Drops</span>
                    <span className="text-red-400 font-medium">{profile.failed_drops}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Validations Given</span>
                    <span className="text-purple-400 font-medium">{profile.total_validations_given}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
