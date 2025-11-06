import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit'

export async function POST(
  request: Request,
  { params }: { params: { username: string } }
) {
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

    // Rate limiting: 50 follow actions per minute
    const rateLimit = checkRateLimit(
      `follow:${user.id}`,
      RATE_LIMITS.FOLLOW.limit,
      RATE_LIMITS.FOLLOW.window
    )

    if (!rateLimit.success) {
      return NextResponse.json(
        {
          error: 'Too many requests',
          retryAfter: rateLimit.retryAfter,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimit.retryAfter),
          },
        }
      )
    }

    // Get target user by username
    const { data: targetUser, error: userError } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', params.username)
      .single()

    if (userError || !targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Can't follow yourself
    if (targetUser.id === user.id) {
      return NextResponse.json(
        { error: 'Cannot follow yourself' },
        { status: 400 }
      )
    }

    // Create follow (will fail if already following due to primary key constraint)
    const { error: followError } = await supabase
      .from('follows')
      .insert({
        follower_id: user.id,
        following_id: targetUser.id,
      })

    if (followError) {
      // Check if already following
      if (followError.code === '23505') {
        return NextResponse.json(
          { error: 'Already following this user' },
          { status: 400 }
        )
      }
      console.error('Follow error:', followError)
      return NextResponse.json({ error: 'Failed to follow user' }, { status: 500 })
    }

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error) {
    console.error('Follow user error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { username: string } }
) {
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

    // Rate limiting: 50 unfollow actions per minute
    const rateLimit = checkRateLimit(
      `follow:${user.id}`,
      RATE_LIMITS.FOLLOW.limit,
      RATE_LIMITS.FOLLOW.window
    )

    if (!rateLimit.success) {
      return NextResponse.json(
        {
          error: 'Too many requests',
          retryAfter: rateLimit.retryAfter,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimit.retryAfter),
          },
        }
      )
    }

    // Get target user by username
    const { data: targetUser, error: userError } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', params.username)
      .single()

    if (userError || !targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Delete follow
    const { error: unfollowError } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', user.id)
      .eq('following_id', targetUser.id)

    if (unfollowError) {
      console.error('Unfollow error:', unfollowError)
      return NextResponse.json({ error: 'Failed to unfollow user' }, { status: 500 })
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('Unfollow user error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
