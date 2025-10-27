import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

    const dropId = params.id

    // Verify drop exists
    const { data: drop, error: dropError } = await supabase
      .from('drops')
      .select('id')
      .eq('id', dropId)
      .single()

    if (dropError || !drop) {
      return NextResponse.json({ error: 'Drop not found' }, { status: 404 })
    }

    // Create save (will fail if already saved due to primary key constraint)
    const { error: saveError } = await supabase
      .from('drop_saves')
      .insert({
        user_id: user.id,
        drop_id: dropId,
      })

    if (saveError) {
      // Check if already saved
      if (saveError.code === '23505') {
        return NextResponse.json(
          { error: 'Drop already saved' },
          { status: 400 }
        )
      }
      console.error('Save error:', saveError)
      return NextResponse.json({ error: 'Failed to save drop' }, { status: 500 })
    }

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error) {
    console.error('Save drop error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
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

    const dropId = params.id

    // Delete save
    const { error: deleteError } = await supabase
      .from('drop_saves')
      .delete()
      .eq('user_id', user.id)
      .eq('drop_id', dropId)

    if (deleteError) {
      console.error('Unsave error:', deleteError)
      return NextResponse.json({ error: 'Failed to unsave drop' }, { status: 500 })
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('Unsave drop error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
