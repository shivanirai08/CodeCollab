import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req) {
  const { email } = await req.json()
  const supabase = createClient({
    key: process.env.SUPABASE_SERVICE_ROLE_KEY, // service role required
  })

  try {
    const { data, error } = await supabase.auth.admin.generateLink({
      type: 'signup',
      email,
      redirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/auth/callback`,
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('resend verification email error', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}