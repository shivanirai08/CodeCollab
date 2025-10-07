// app/api/oauth/route.js
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(req) {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/api/callback`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  if (data?.url) return NextResponse.redirect(data.url)

  return NextResponse.json({ error: 'OAuth URL not found' }, { status: 500 })
}
