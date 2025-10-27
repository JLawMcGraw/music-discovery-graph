import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DropCard } from '@/components/DropCard'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function SavedDropsPage() {
  const supabase = createClient()

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/auth/signin')
  }

  // Fetch saved drops
  const { data: savedDrops, error: savedError } = await supabase
    .from('drop_saves')
    .select(`
      drop_id,
      created_at,
      drops (
        *,
        profiles:user_id (
          username,
          avatar_url,
          follower_count
        )
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  // Flatten the data structure
  const drops = savedDrops?.map((save: any) => ({
    ...save.drops,
    is_saved: true,
    saved_at: save.created_at
  })) || []

  return (
    <div className="min-h-screen bg-gray-900 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/feed"
            className="inline-flex items-center text-gray-400 hover:text-white mb-4"
          >
            ← Back to Feed
          </Link>

          <h1 className="text-4xl font-bold text-white mb-2">Saved Drops</h1>
          <p className="text-gray-400">
            Tracks you've saved for later
          </p>
        </div>

        {/* Saved Drops */}
        {drops.length > 0 ? (
          <div className="space-y-6">
            {drops.map((drop) => (
              <DropCard
                key={drop.id}
                drop={drop}
                currentUserId={user.id}
              />
            ))}
          </div>
        ) : (
          <div className="bg-gray-800 rounded-lg p-12 text-center">
            <div className="text-4xl mb-4">💾</div>
            <h2 className="text-2xl font-semibold text-white mb-2">
              No saved drops yet
            </h2>
            <p className="text-gray-400 mb-6">
              Save drops you love to come back to them later
            </p>
            <Link
              href="/feed"
              className="inline-block px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-lg transition-all"
            >
              Explore Drops
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
