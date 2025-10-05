'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client' // or server utils if needed

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    async function handleAuth() {
      const supabase = createClient()

      // v2 equivalent of getSessionFromUrl
      const { session, error } = await supabase.auth.getSessionFromUrl({ storeSession: true })

      if (error) {
        console.error('OAuth callback error:', error)
        router.push('/auth/error')
        return
      }

      // session is now stored in localStorage or cookies (if you set it)
      console.log('Logged in session:', session)
      router.push('/dashboard')
    }

    handleAuth()
  }, [router])

  return <div>Processing authentication...</div>
}
