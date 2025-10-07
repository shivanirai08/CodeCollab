import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req) {
  const supabase = await createClient()
  const { email, password } = await req.json()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}