import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const createDropSchema = z.object({
  track_id: z.string().min(1),
  platform: z.enum(['spotify', 'apple_music', 'youtube', 'soundcloud']).default('spotify'),
  track_name: z.string().min(1).max(500),
  artist_name: z.string().min(1).max(500),
  album_name: z.string().max(500).optional(),
  album_art_url: z.string().url().nullish(),
  external_url: z.string().url().nullish(),
  preview_url: z.string().url().nullish(),
  context: z.string().min(50, 'Context must be at least 50 characters').max(2000),
  listening_notes: z.string().max(1000).optional(),
  genres: z.array(z.string()).optional(),
  moods: z.array(z.string()).optional(),
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

    // Check weekly drop limit (10 drops per week for all users)
    const { data: weeklyCount, error: countError } = await supabase
      .rpc('get_weekly_drop_count', { user_uuid: user.id })

    if (countError) {
      console.error('Weekly count check error:', countError)
      return NextResponse.json({ error: 'Failed to check drop limit' }, { status: 500 })
    }

    if (weeklyCount >= 10) {
      // Get next reset time
      const { data: nextReset } = await supabase.rpc('get_next_week_reset')

      return NextResponse.json(
        {
          error: 'Weekly limit reached',
          message: 'You can post 10 drops per week. This helps you curate your best picks.',
          drops_this_week: weeklyCount,
          limit: 10,
          resets_at: nextReset,
        },
        { status: 429 }
      )
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

    return NextResponse.json(
      {
        drop,
        drops_this_week: weeklyCount + 1,
        limit: 10,
      },
      { status: 201 }
    )
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
