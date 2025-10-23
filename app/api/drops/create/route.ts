import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const createDropSchema = z.object({
  track_id: z.string().min(1),
  platform: z.enum(['spotify', 'apple_music', 'youtube', 'soundcloud']).default('spotify'),
  track_name: z.string().min(1).max(500),
  artist_name: z.string().min(1).max(500),
  album_name: z.string().max(500).optional(),
  album_art_url: z.string().url().optional(),
  external_url: z.string().url(),
  preview_url: z.string().url().optional(),
  context: z.string().min(50, 'Context must be at least 50 characters').max(2000),
  listening_notes: z.string().max(1000).optional(),
  reputation_stake: z.number().int().min(10).max(100),
  genres: z.array(z.string()).optional(),
  mood_tags: z.array(z.string()).optional(),
})

export async function POST(request: Request) {
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

    // Parse and validate request body
    const body = await request.json()
    const validatedData = createDropSchema.parse(body)

    // Get user's profile to check available reputation
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('reputation_available, tier')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Check if user has enough reputation
    if (profile.reputation_available < validatedData.reputation_stake) {
      return NextResponse.json(
        {
          error: 'Insufficient reputation',
          available: profile.reputation_available,
          required: validatedData.reputation_stake,
        },
        { status: 400 }
      )
    }

    // Check rate limits for free tier
    if (profile.tier === 'free') {
      const { count } = await supabase
        .from('drops')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

      if (count && count >= 3) {
        return NextResponse.json(
          { error: 'Daily limit reached (3 drops/day for free tier)' },
          { status: 429 }
        )
      }
    }

    // Create the drop
    const { data: drop, error: dropError } = await supabase
      .from('drops')
      .insert({
        user_id: user.id,
        ...validatedData,
      })
      .select()
      .single()

    if (dropError) {
      console.error('Drop creation error:', dropError)
      return NextResponse.json({ error: 'Failed to create drop' }, { status: 500 })
    }

    // Record reputation event (staking points)
    const { error: reputationError } = await supabase.from('reputation_events').insert({
      user_id: user.id,
      event_type: 'drop_created',
      points_change: 0, // No immediate change, just staking
      new_trust_score: profile.reputation_available, // Will be updated by trigger
      new_reputation_available: profile.reputation_available - validatedData.reputation_stake,
      related_drop_id: drop.id,
      metadata: {
        stake: validatedData.reputation_stake,
      },
    })

    if (reputationError) {
      console.error('Reputation event error:', reputationError)
      // Don't fail the request, drop was created
    }

    return NextResponse.json({ drop }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Create drop error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
