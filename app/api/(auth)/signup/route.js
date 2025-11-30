import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { rateLimit, getClientIp } from '@/lib/rateLimit'

// Rate limiter: 3 signup attempts per 15 minutes per IP
const limiter = rateLimit({
  interval: 15 * 60 * 1000, // 15 minutes
  uniqueTokenPerInterval: 3
});

export async function POST(req) {
  // Apply rate limiting to prevent spam signups
  const ip = getClientIp(req);
  try {
    await limiter.check(3, ip);
  } catch (error) {
    return NextResponse.json(
      { error: 'Too many signup attempts. Please try again later.', retryAfter: error.retryAfter },
      {
        status: 429,
        headers: {
          'Retry-After': error.retryAfter?.toString() || '900',
          'X-RateLimit-Limit': '3',
          'X-RateLimit-Remaining': '0'
        }
      }
    );
  }

  try {
    const { username, email, password } = await req.json()

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
      data: {
        username,
      },
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
