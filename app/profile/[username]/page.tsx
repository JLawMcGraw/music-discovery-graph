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

  // Check if current user is following this profile
  let isFollowing = false
  if (currentUser) {
    const { data: followData } = await supabase
      .from('follows')
      .select('follower_id')
      .eq('follower_id', currentUser.id)
      .eq('following_id', profile.id)
      .single()

    isFollowing = !!followData
  }

  // Fetch user's drops with save status for current user
  const dropsQuery = supabase
    .from('drops')
    .select(`
      *,
      profiles:user_id (
        username,
        avatar_url,
        follower_count
      )
    `)
    .eq('user_id', profile.id)
    .order('created_at', { ascending: false })
    .limit(20)

  const { data: drops } = await dropsQuery

  // If current user is logged in, check which drops they've saved
  let savedDropIds: string[] = []
  if (currentUser && drops) {
    const { data: saves } = await supabase
      .from('drop_saves')
      .select('drop_id')
      .eq('user_id', currentUser.id)
      .in('drop_id', drops.map(d => d.id))

    savedDropIds = saves?.map(s => s.drop_id) || []
  }

  // Add is_saved flag to drops
  const dropsWithSaveStatus = drops?.map(drop => ({
    ...drop,
    is_saved: savedDropIds.includes(drop.id)
  }))

  // Fetch genre stats for this user
  const { data: genreStats } = await supabase
    .from('user_genre_stats')
    .select('*')
    .eq('user_id', profile.id)
    .order('total_drops', { ascending: false })
    .limit(5)

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
                </div>
                <p className="text-gray-400 mb-4">@{profile.username}</p>

                {profile.bio && (
                  <p className="text-gray-300 mb-4 leading-relaxed">{profile.bio}</p>
                )}

                {/* Curation Statement */}
                {profile.curation_statement && (
                  <div className="bg-gray-900 rounded-lg p-4 mb-4 border-l-4 border-purple-500">
                    <p className="text-sm text-gray-400 mb-1">How I curate:</p>
                    <p className="text-gray-200 leading-relaxed">{profile.curation_statement}</p>
                  </div>
                )}

                {/* Genre Preferences */}
                {profile.genre_preferences && profile.genre_preferences.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {profile.genre_preferences.map((genre: string) => (
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
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <div className="text-2xl font-bold text-white">{profile.total_drops}</div>
                    <div className="text-sm text-gray-400">Drops</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-white">{profile.follower_count || 0}</div>
                    <div className="text-sm text-gray-400">Followers</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-white">{profile.following_count || 0}</div>
                    <div className="text-sm text-gray-400">Following</div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2">
                {isOwnProfile ? (
                  <Link
                    href="/profile/edit"
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-center"
                  >
                    Edit Profile
                  </Link>
                ) : (
                  <form action={`/api/users/${profile.username}/follow`} method="POST">
                    <button
                      type="submit"
                      className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                        isFollowing
                          ? 'bg-gray-700 hover:bg-gray-600 text-white'
                          : 'bg-purple-600 hover:bg-purple-700 text-white'
                      }`}
                    >
                      {isFollowing ? 'Following' : 'Follow'}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-2xl font-bold text-white">Drops</h2>

            {dropsWithSaveStatus && dropsWithSaveStatus.length > 0 ? (
              <div className="space-y-6">
                {dropsWithSaveStatus.map((drop) => (
                  <DropCard key={drop.id} drop={drop} currentUserId={currentUser?.id} />
                ))}
              </div>
            ) : (
              <div className="bg-gray-800 rounded-lg p-12 text-center">
                <div className="text-4xl mb-4">🎵</div>
                <h3 className="text-xl font-semibold text-white mb-2">No drops yet</h3>
                <p className="text-gray-400 mb-4">
                  {isOwnProfile
                    ? "Share up to 10 drops per week that define your taste!"
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
            {/* Taste Areas */}
            {genreStats && genreStats.length > 0 && (
              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-white mb-4">Taste Areas</h3>

                <div className="space-y-4">
                  {genreStats.map((stat) => (
                    <div key={stat.genre}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-white font-medium">{stat.genre}</span>
                        <span className="text-sm text-gray-400 capitalize">{stat.activity_level}</span>
                      </div>
                      <div className="text-sm text-gray-400 mb-2">
                        {stat.total_drops} drops • {stat.total_saves_received} saves
                      </div>
                      {stat.last_drop_at && (
                        <div className="text-xs text-gray-500">
                          Last drop: {new Date(stat.last_drop_at).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* About */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-white mb-4">About</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Joined</span>
                  <span className="text-white">
                    {new Date(profile.created_at).toLocaleDateString('en-US', {
                      month: 'long',
                      year: 'numeric'
                    })}
                  </span>
                </div>
                {profile.onboarded && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Status</span>
                    <span className="text-green-400">Active curator</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
