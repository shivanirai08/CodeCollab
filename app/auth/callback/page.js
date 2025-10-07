'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function CallbackPage() {
  const router = useRouter()

  useEffect(() => {
    const handleAuth = async () => {
      const hash = window.location.hash
      const params = new URLSearchParams(hash.replace('#', ''))
      const access_token = params.get('access_token')
      const refresh_token = params.get('refresh_token')

      if (access_token && refresh_token) {
        const supabase = createClient()
        const { error } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        })

        if (error) {
          console.error('Failed to set session:', error)
          router.push('/auth/login')
        } else {
          router.push('/dashboard') // redirect only after session is set
        }
      } else {
        router.push('/auth/login')
      }
    }

    handleAuth()
  }, [router])

  return <p>Loading...</p>
}
