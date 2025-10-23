import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const clickSchema = z.object({
  platform: z.enum(['spotify', 'apple_music', 'youtube', 'soundcloud']),
})

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    const dropId = params.id

    // Get user if authenticated (optional)
    const {
      data: { user },
    } = await supabase.auth.getUser()

    // Parse request
    const body = await request.json()
    const { platform } = clickSchema.parse(body)

    // Get referrer and user agent
    const referrer = request.headers.get('referer') || null
    const userAgent = request.headers.get('user-agent') || null

    // Log the click
    const { error: clickError } = await supabase.from('platform_clicks').insert({
      drop_id: dropId,
      user_id: user?.id || null,
      platform,
      referrer,
      user_agent: userAgent,
    })

    if (clickError) {
      console.error('Click tracking error:', clickError)
      // Don't fail the request, click tracking is best-effort
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Click tracking error:', error)
    // Return success anyway - click tracking shouldn't block user
    return NextResponse.json({ success: true })
  }
}
