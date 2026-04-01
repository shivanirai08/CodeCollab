import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient(request = null) {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        // For API routes: read from request headers if available
        getAll: () => {
          if (request?.headers) {
            const cookieHeader = request.headers.get('cookie') || '';
            return cookieHeader.split(';').map(cookie => {
              const [name, value] = cookie.trim().split('=');
              return { name, value };
            }).filter(c => c.name && c.value);
          }
          return cookieStore.getAll();
        },
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {
            // Ignored in server components or API routes
          }
        },
      },
    }
  )
}