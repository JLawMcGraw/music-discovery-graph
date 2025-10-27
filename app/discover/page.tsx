import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import Image from 'next/image'

export const dynamic = 'force-dynamic'

interface SearchParams {
  genre?: string
  sort?: string
}

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const supabase = createClient()

  // Get current user
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser()

  const selectedGenre = searchParams.genre
  const sortBy = searchParams.sort || 'followers'

  // Get list of all genres from genre stats
  const { data: allGenres } = await supabase
    .from('user_genre_stats')
    .select('genre')
    .order('genre')

  const uniqueGenres = allGenres
    ? Array.from(new Set(allGenres.map((g) => g.genre))).sort()
    : []

  // Build curator query
  let query = supabase
    .from('profiles')
    .select(`
      id,
      username,
      display_name,
      bio,
      curation_statement,
      avatar_url,
      follower_count,
      following_count,
      total_drops,
      genre_preferences,
      top_genres
    `)
    .gt('total_drops', 0) // Only show curators with at least 1 drop

  // Apply ordering
  if (sortBy === 'active') {
    query = query.order('total_drops', { ascending: false })
  } else if (sortBy === 'new') {
    query = query.order('created_at', { ascending: false })
  } else {
    // default: followers
    query = query.order('follower_count', { ascending: false })
  }

  const { data: allCurators } = await query.limit(50)

  // Filter by genre if selected (client-side since we need to check arrays)
  let curators = allCurators || []
  if (selectedGenre) {
    curators = curators.filter(
      (c) =>
        c.genre_preferences?.includes(selectedGenre) ||
        c.top_genres?.includes(selectedGenre)
    )
  }

  // Get following list for current user
  let followingIds: string[] = []
  if (currentUser) {
    const { data: following } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', currentUser.id)

    followingIds = following?.map((f) => f.following_id) || []
  }

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

          <h1 className="text-4xl font-bold text-white mb-2">Discover Curators</h1>
          <p className="text-gray-400">
            Find tastemakers whose music taste aligns with yours
          </p>
        </div>

        {/* Filters */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Genre Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Filter by Genre
              </label>
              <select
                value={selectedGenre || ''}
                onChange={(e) => {
                  const url = new URL(window.location.href)
                  if (e.target.value) {
                    url.searchParams.set('genre', e.target.value)
                  } else {
                    url.searchParams.delete('genre')
                  }
                  window.location.href = url.toString()
                }}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">All Genres</option>
                {uniqueGenres.map((genre) => (
                  <option key={genre} value={genre}>
                    {genre}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Sort by
              </label>
              <select
                value={sortBy}
                onChange={(e) => {
                  const url = new URL(window.location.href)
                  url.searchParams.set('sort', e.target.value)
                  window.location.href = url.toString()
                }}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="followers">Most Followers</option>
                <option value="active">Most Active</option>
                <option value="new">Newest Curators</option>
              </select>
            </div>
          </div>
        </div>

        {/* Curators Grid */}
        {curators.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {curators.map((curator) => {
              const isFollowing = followingIds.includes(curator.id)
              const isOwnProfile = currentUser?.id === curator.id

              return (
                <div
                  key={curator.id}
                  className="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <Link href={`/profile/${curator.username}`}>
                      {curator.avatar_url ? (
                        <Image
                          src={curator.avatar_url}
                          alt={curator.username}
                          width={64}
                          height={64}
                          className="rounded-full"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center text-white text-xl font-bold">
                          {curator.username[0].toUpperCase()}
                        </div>
                      )}
                    </Link>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/profile/${curator.username}`}
                        className="hover:text-purple-400 transition-colors"
                      >
                        <h3 className="text-lg font-semibold text-white mb-1">
                          {curator.display_name || curator.username}
                        </h3>
                        <p className="text-sm text-gray-400 mb-2">@{curator.username}</p>
                      </Link>

                      {curator.curation_statement && (
                        <p className="text-sm text-gray-300 mb-3 line-clamp-2">
                          {curator.curation_statement}
                        </p>
                      )}

                      {/* Genres */}
                      {curator.top_genres && curator.top_genres.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {curator.top_genres.slice(0, 3).map((genre) => (
                            <span
                              key={genre}
                              className="px-2 py-1 bg-gray-900 text-gray-400 text-xs rounded"
                            >
                              {genre}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Stats */}
                      <div className="flex items-center gap-4 text-sm text-gray-400 mb-3">
                        <span>{curator.total_drops} drops</span>
                        <span>{curator.follower_count || 0} followers</span>
                      </div>

                      {/* Action */}
                      {!isOwnProfile && (
                        <form action={`/api/users/${curator.username}/follow`} method="POST">
                          <button
                            type="submit"
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
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
              )
            })}
          </div>
        ) : (
          <div className="bg-gray-800 rounded-lg p-12 text-center">
            <div className="text-4xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-white mb-2">
              No curators found
            </h3>
            <p className="text-gray-400">
              {selectedGenre
                ? `Try selecting a different genre or view all curators`
                : 'Check back soon as more curators join the platform'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
