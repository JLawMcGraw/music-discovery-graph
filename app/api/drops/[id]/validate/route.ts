import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const validateDropSchema = z.object({
  rating: z.number().int().min(1).max(5),
  listened: z.boolean().default(false),
  feedback: z.string().max(500).optional(),
})

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
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

    // Parse and validate request body
    const body = await request.json()
    const validatedData = validateDropSchema.parse(body)

    const dropId = params.id

    // Get the drop
    const { data: drop, error: dropError } = await supabase
      .from('drops')
      .select('id, user_id, status')
      .eq('id', dropId)
      .single()

    if (dropError || !drop) {
      return NextResponse.json({ error: 'Drop not found' }, { status: 404 })
    }

    // Can't validate own drop
    if (drop.user_id === user.id) {
      return NextResponse.json(
        { error: 'Cannot validate your own drop' },
        { status: 400 }
      )
    }

    // Can only validate active drops
    if (drop.status !== 'active') {
      return NextResponse.json(
        { error: 'Drop is not active' },
        { status: 400 }
      )
    }

    // Check if already validated
    const { data: existing } = await supabase
      .from('drop_validations')
      .select('id')
      .eq('drop_id', dropId)
      .eq('validator_id', user.id)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'You have already validated this drop' },
        { status: 400 }
      )
    }

    // Create validation
    const { data: validation, error: validationError } = await supabase
      .from('drop_validations')
      .insert({
        drop_id: dropId,
        validator_id: user.id,
        ...validatedData,
      })
      .select()
      .single()

    if (validationError) {
      console.error('Validation creation error:', validationError)
      return NextResponse.json(
        { error: 'Failed to create validation' },
        { status: 500 }
      )
    }

    return NextResponse.json({ validation }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Validate drop error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
