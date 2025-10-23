import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * Cron job to resolve expired drops
 * Should run daily via Vercel Cron or similar
 *
 * Resolves drops that:
 * - Are in 'active' status
 * - Have expired (expires_at < NOW)
 * - Have at least 3 validations
 *
 * Outcome based on average rating:
 * - 70%+ (3.5/5+): Return stake + 50% bonus
 * - 40-70% (2-3.5/5): Return original stake
 * - <40% (<2/5): Lose stake
 */
export async function GET(request: Request) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient()

    // Fetch expired drops ready for resolution
    const { data: expiredDrops, error: fetchError } = await supabase
      .from('drops')
      .select(`
        id,
        user_id,
        reputation_stake,
        validation_count,
        total_rating_sum,
        validation_score
      `)
      .eq('status', 'active')
      .lt('expires_at', new Date().toISOString())
      .gte('validation_count', 3)

    if (fetchError) {
      throw fetchError
    }

    if (!expiredDrops || expiredDrops.length === 0) {
      return NextResponse.json({
        message: 'No drops to resolve',
        resolved: 0,
      })
    }

    const results = {
      resolved: 0,
      validated: 0,
      failed: 0,
      errors: [] as string[],
    }

    // Process each drop
    for (const drop of expiredDrops) {
      try {
        // Calculate average rating (already normalized to 0-1 in validation_score)
        const avgRating = drop.validation_score * 5 // Convert back to 1-5 scale

        // Determine outcome
        let status: 'validated' | 'failed' = 'validated'
        let pointsChange = 0
        let pointsReturned = 0

        if (avgRating >= 3.5) {
          // Great recommendation: return stake + 50% bonus
          status = 'validated'
          pointsChange = Math.floor(drop.reputation_stake * 0.5) // Bonus only
          pointsReturned = drop.reputation_stake + pointsChange
        } else if (avgRating >= 2.0) {
          // Okay recommendation: return stake only
          status = 'validated'
          pointsChange = 0
          pointsReturned = drop.reputation_stake
        } else {
          // Poor recommendation: lose stake
          status = 'failed'
          pointsChange = -drop.reputation_stake
          pointsReturned = 0
        }

        // Update drop status
        const { error: updateError } = await supabase
          .from('drops')
          .update({
            status,
            resolved_at: new Date().toISOString(),
          })
          .eq('id', drop.id)

        if (updateError) {
          throw updateError
        }

        // Get current user profile for new scores
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('trust_score, reputation_available')
          .eq('id', drop.user_id)
          .single()

        if (profileError || !profile) {
          throw new Error('Profile not found')
        }

        // Calculate new scores
        const newTrustScore = Math.max(0, profile.trust_score + pointsChange)
        const newReputationAvailable = profile.reputation_available + pointsReturned

        // Record reputation event (trigger will update profile)
        const { error: reputationError } = await supabase
          .from('reputation_events')
          .insert({
            user_id: drop.user_id,
            event_type: status === 'validated' ? 'drop_validated' : 'drop_failed',
            points_change: pointsChange,
            new_trust_score: newTrustScore,
            new_reputation_available: newReputationAvailable,
            related_drop_id: drop.id,
            metadata: {
              stake: drop.reputation_stake,
              validation_score: drop.validation_score,
              validator_count: drop.validation_count,
              points_returned: pointsReturned,
              avg_rating: avgRating,
            },
          })

        if (reputationError) {
          throw reputationError
        }

        results.resolved++
        if (status === 'validated') {
          results.validated++
        } else {
          results.failed++
        }
      } catch (err) {
        console.error(`Error resolving drop ${drop.id}:`, err)
        results.errors.push(`Drop ${drop.id}: ${err instanceof Error ? err.message : 'Unknown error'}`)
      }
    }

    return NextResponse.json({
      message: 'Drops resolved successfully',
      ...results,
    })
  } catch (error) {
    console.error('Cron job error:', error)
    return NextResponse.json(
      {
        error: 'Failed to resolve drops',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
