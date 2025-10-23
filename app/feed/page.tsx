import { createClient } from '@/lib/supabase/server'
import { DropCard } from '@/components/DropCard'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function FeedPage() {
  const supabase = createClient()

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Fetch active drops with user profiles
  const { data: drops, error } = await supabase
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
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) {
    console.error('Error fetching drops:', error)
  }

  return (
    <div className="min-h-screen bg-gray-900 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
              Signal
            </h1>
            <p className="text-gray-400">Discover music through trusted humans</p>
          </div>
          {user ? (
            <div className="flex gap-3">
              <Link
                href="/drop/create"
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-lg transition-all"
              >
                Create Drop
              </Link>
              <Link
                href={`/profile/${user.id}`}
                className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-lg transition-colors"
              >
                Profile
              </Link>
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

        {/* Feed */}
        {drops && drops.length > 0 ? (
          <div className="space-y-6">
            {drops.map((drop) => (
              <DropCard key={drop.id} drop={drop} currentUserId={user?.id} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🎵</div>
            <h2 className="text-2xl font-semibold text-white mb-2">No drops yet</h2>
            <p className="text-gray-400 mb-6">Be the first to stake your reputation on a recommendation!</p>
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
