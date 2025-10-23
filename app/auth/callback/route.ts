import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const supabase = createServerComponentClient({ cookies })
    await supabase.auth.exchangeCodeForSession(code)
  }

  // Redirect to onboarding or feed
  return NextResponse.redirect(new URL('/onboarding', requestUrl.origin))
}
