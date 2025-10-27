import { createClient } from '@/lib/supabase/server'
import { DropCard } from '@/components/DropCard'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

interface SearchParams {
  tab?: string
}

export default async function FeedPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = createClient()

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const currentTab = searchParams.tab || 'discover'

  // Get list of users current user is following
  let followingIds: string[] = []
  if (user) {
    const { data: following } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id)

    followingIds = following?.map((f) => f.following_id) || []
  }

  // Build drops query based on tab
  let dropsQuery = supabase
    .from('drops')
    .select(`
      *,
      profiles:user_id (
        username,
        avatar_url,
        follower_count
      )
    `)
    .order('created_at', { ascending: false })
    .limit(20)

  // Filter by following if on following tab
  if (currentTab === 'following' && followingIds.length > 0) {
    dropsQuery = dropsQuery.in('user_id', followingIds)
  }

  const { data: drops, error } = await dropsQuery

  if (error) {
    console.error('Error fetching drops:', error)
  }

  // Get saved drop IDs for current user
  let savedDropIds: string[] = []
  if (user && drops) {
    const { data: saves } = await supabase
      .from('drop_saves')
      .select('drop_id')
      .eq('user_id', user.id)
      .in('drop_id', drops.map(d => d.id))

    savedDropIds = saves?.map(s => s.drop_id) || []
  }

  // Add is_saved flag to drops
  const dropsWithSaveStatus = drops?.map(drop => ({
    ...drop,
    is_saved: savedDropIds.includes(drop.id)
  }))

  // Get user's username for profile link
  let currentUsername: string | null = null
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .single()

    currentUsername = profile?.username || null
  }

  const showEmptyFollowing = currentTab === 'following' && followingIds.length === 0

  return (
    <div className="min-h-screen bg-gray-900 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
              DeepCuts
            </h1>
            <p className="text-gray-400">Discover music through trusted tastemakers</p>
          </div>
          {user ? (
            <div className="flex gap-3">
              <Link
                href="/discover"
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors"
              >
                Discover
              </Link>
              <Link
                href="/saved"
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors"
              >
                Saved
              </Link>
              <Link
                href="/drop/create"
                className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-lg transition-all"
              >
                Create Drop
              </Link>
              {currentUsername && (
                <Link
                  href={`/profile/${currentUsername}`}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors"
                >
                  Profile
                </Link>
              )}
            </div>
          ) : (
            <Link
              href="/auth/signin"
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors"
            >
              Sign In
            </Link>
          )}
        </div>

        {/* Tabs */}
        {user && (
          <div className="flex gap-4 mb-6 border-b border-gray-800">
            <Link
              href="/feed?tab=discover"
              className={`px-4 py-2 font-medium transition-colors border-b-2 ${
                currentTab === 'discover'
                  ? 'text-purple-400 border-purple-400'
                  : 'text-gray-400 border-transparent hover:text-gray-300'
              }`}
            >
              Discover
            </Link>
            <Link
              href="/feed?tab=following"
              className={`px-4 py-2 font-medium transition-colors border-b-2 ${
                currentTab === 'following'
                  ? 'text-purple-400 border-purple-400'
                  : 'text-gray-400 border-transparent hover:text-gray-300'
              }`}
            >
              Following {followingIds.length > 0 && `(${followingIds.length})`}
            </Link>
          </div>
        )}

        {/* Feed */}
        {showEmptyFollowing ? (
          <div className="text-center py-16 bg-gray-800 rounded-lg">
            <div className="text-6xl mb-4">👥</div>
            <h2 className="text-2xl font-semibold text-white mb-2">
              You're not following anyone yet
            </h2>
            <p className="text-gray-400 mb-6">
              Follow curators to see their drops in your feed
            </p>
            <Link
              href="/discover"
              className="inline-block px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-lg transition-all"
            >
              Discover Curators
            </Link>
          </div>
        ) : dropsWithSaveStatus && dropsWithSaveStatus.length > 0 ? (
          <div className="space-y-6">
            {dropsWithSaveStatus.map((drop) => (
              <DropCard key={drop.id} drop={drop} currentUserId={user?.id} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-gray-800 rounded-lg">
            <div className="text-6xl mb-4">🎵</div>
            <h2 className="text-2xl font-semibold text-white mb-2">No drops yet</h2>
            <p className="text-gray-400 mb-6">
              {user
                ? 'Be the first to share your taste with the community!'
                : 'Sign in to start discovering music from trusted curators'}
            </p>
            {user && (
              <Link
                href="/drop/create"
                className="inline-block px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-lg transition-all"
              >
                Create First Drop
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
