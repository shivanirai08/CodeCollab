import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(req) {
  try {
    const { email, password } = await req.json()

    // 1. Service role client to query the users table
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // 2. Check if user already exists
    const { data: existingUser, error: checkError } = await supabaseAdmin
      .from('users')
      .select('id, email')
      .eq('email', email)
      .maybeSingle()

    if (checkError) {
      console.error('Error checking existing user:', checkError)
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }

    if (existingUser) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 400 })
    }

    // 3. Create new user with auth client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )

    const { data, error: signupError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/auth/callback`,
      }
    })

    if (signupError) {
      console.error('Signup error:', signupError)
      return NextResponse.json({ error: signupError.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, user: data.user })
  } catch (err) {
    console.error('Unexpected signup error:', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
