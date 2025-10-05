import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req) {
  const supabase = await createClient()
  const { error } = await supabase.auth.signOut()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}