import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const feedQuerySchema = z.object({
  tab: z.enum(['following', 'discover']).default('following'),
  limit: z.number().int().min(1).max(50).default(20),
  cursor: z.string().optional(), // ISO timestamp of last drop
})

export async function GET(request: Request) {
  try {
    const supabase = createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const params = feedQuerySchema.parse({
      tab: searchParams.get('tab') || 'following',
      limit: parseInt(searchParams.get('limit') || '20'),
      cursor: searchParams.get('cursor') || undefined,
    })

    let drops: any[] = []
    let hasMore = false

    if (params.tab === 'following') {
      // Get list of users being followed
      const { data: following } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id)

      const followingIds = following?.map((f) => f.following_id) || []

      if (followingIds.length === 0) {
        // No following, return empty
        return NextResponse.json({
          drops: [],
          nextCursor: null,
          hasMore: false,
        })
      }

      // Build query for following feed
      let query = supabase
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
        .limit(params.limit + 1) // Fetch one extra to check if more exist

      // Apply cursor (pagination)
      if (params.cursor) {
        query = query.lt('created_at', params.cursor)
      }

      const { data, error } = await query

      if (error) {
        console.error('Feed query error:', error)
        return NextResponse.json({ error: 'Failed to fetch feed' }, { status: 500 })
      }

      drops = data || []
    } else {
      // Discover tab: all drops
      let query = supabase
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
        .limit(params.limit + 1)

      if (params.cursor) {
        query = query.lt('created_at', params.cursor)
      }

      const { data, error } = await query

      if (error) {
        console.error('Discover query error:', error)
        return NextResponse.json({ error: 'Failed to fetch drops' }, { status: 500 })
      }

      drops = data || []
    }

    // Check if there are more results
    hasMore = drops.length > params.limit

    // Remove the extra item used for hasMore check
    if (hasMore) {
      drops = drops.slice(0, params.limit)
    }

    // Get next cursor (created_at of last item)
    const nextCursor = drops.length > 0 ? drops[drops.length - 1].created_at : null

    // Check if user has saved each drop
    const dropIds = drops.map(d => d.id)
    const { data: savedDrops } = await supabase
      .from('drop_saves')
      .select('drop_id')
      .eq('user_id', user.id)
      .in('drop_id', dropIds)

    const savedDropIds = new Set(savedDrops?.map(s => s.drop_id) || [])

    // Add isSaved flag to each drop
    const dropsWithSaveStatus = drops.map(drop => ({
      ...drop,
      isSaved: savedDropIds.has(drop.id)
    }))

    return NextResponse.json({
      drops: dropsWithSaveStatus,
      nextCursor,
      hasMore,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Feed API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
