import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req) {
  const { searchParams, origin } = new URL(req.url)
  const code = searchParams.get('code')
  let next = searchParams.get('next') ?? '/'
  if (!next.startsWith('/')) next = '/'

  if (!code) return NextResponse.redirect(`${origin}/auth/auth-code-error`)

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) return NextResponse.redirect(`${origin}/auth/login`)

  //redirect to dashboard
  return NextResponse.redirect(`${origin}/dashboard`)
}
