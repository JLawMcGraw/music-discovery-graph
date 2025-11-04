import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import FeedTabs from '@/components/FeedTabs'
import InfiniteScrollFeed from '@/components/InfiniteScrollFeed'

export const dynamic = 'force-dynamic'

interface SearchParams {
  tab?: string
}

export default async function FeedPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const supabase = createClient()

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/signin')
  }

  // Check if user completed onboarding
  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarded, username')
    .eq('id', user.id)
    .single()

  if (!profile?.onboarded) {
    redirect('/onboarding')
  }

  const activeTab = (searchParams.tab === 'discover' ? 'discover' : 'following') as 'following' | 'discover'

  // Fetch initial page of drops (20 items)
  let initialDrops: any[] = []
  let initialCursor: string | null = null
  let initialHasMore = false

  if (activeTab === 'following') {
    // Get following list
    const { data: following } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id)

    const followingIds = following?.map((f) => f.following_id) || []

    if (followingIds.length > 0) {
      const { data: drops } = await supabase
        .from('drops')
        .select(`
          *,
          profiles:user_id (
            username,
            display_name,
            avatar_url,
            follower_count
          )
        `)
        .in('user_id', followingIds)
        .order('created_at', { ascending: false })
        .limit(21) // Fetch 21 to check if more exist

      if (drops && drops.length > 0) {
        initialHasMore = drops.length > 20
        initialDrops = drops.slice(0, 20)
        initialCursor = initialDrops[initialDrops.length - 1].created_at

        // Get save status for initial drops
        const dropIds = initialDrops.map(d => d.id)
        const { data: savedDrops } = await supabase
          .from('drop_saves')
          .select('drop_id')
          .eq('user_id', user.id)
          .in('drop_id', dropIds)

        const savedDropIds = new Set(savedDrops?.map(s => s.drop_id) || [])
        initialDrops = initialDrops.map(drop => ({
          ...drop,
          isSaved: savedDropIds.has(drop.id)
        }))
      }
    }
  } else {
    // Discover: all drops
    const { data: drops } = await supabase
      .from('drops')
      .select(`
        *,
        profiles:user_id (
          username,
          display_name,
          avatar_url,
          follower_count
        )
      `)
      .order('created_at', { ascending: false })
      .limit(21)

    if (drops && drops.length > 0) {
      initialHasMore = drops.length > 20
      initialDrops = drops.slice(0, 20)
      initialCursor = initialDrops[initialDrops.length - 1].created_at

      // Get save status
      const dropIds = initialDrops.map(d => d.id)
      const { data: savedDrops } = await supabase
        .from('drop_saves')
        .select('drop_id')
        .eq('user_id', user.id)
        .in('drop_id', dropIds)

      const savedDropIds = new Set(savedDrops?.map(s => s.drop_id) || [])
      initialDrops = initialDrops.map(drop => ({
        ...drop,
        isSaved: savedDropIds.has(drop.id)
      }))
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-white">Feed</h1>
          <div className="flex gap-3">
            <Link
              href="/discover"
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors"
            >
              Discover
            </Link>
            <Link
              href="/drop/create"
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors"
            >
              New Drop
            </Link>
          </div>
        </div>

        {/* Tabs */}
        <FeedTabs activeTab={activeTab} />

        {/* Infinite Scroll Feed */}
        <div className="mt-6">
          <InfiniteScrollFeed
            initialDrops={initialDrops}
            initialCursor={initialCursor}
            initialHasMore={initialHasMore}
            tab={activeTab}
            currentUserId={user.id}
          />
        </div>
      </div>
    </div>
  )
}
