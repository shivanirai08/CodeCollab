"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function NewPwdPage() {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState(null)
  const [message, setMessage] = useState("")
  const router = useRouter()

  const handleNewPassword = async (e) => {
    e.preventDefault()
    setError(null)
    setMessage("")
    if (!password || !confirmPassword) {
      setError("Please fill in both password fields.")
      return
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }
    // Update password using Supabase
    const { error } = await supabase.auth.updateUser({ password })
    if (error) setError(error.message)
    else {
      setMessage("Password updated successfully. Redirecting to login...")
      setTimeout(() => {
        router.push("/auth/login")
      }, 2000)
    }
  }

  return (
    <div className="relative flex items-center justify-center min-h-screen px-4 bg-gradient-to-b from-background via-background to-black">
      {/* Subtle background glow */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.15),transparent_70%)]" />

      <form
        onSubmit={handleNewPassword}
        className="
          relative w-full max-w-md rounded-3xl
          border border-white/10
          bg-white/5 backdrop-blur-2xl
          shadow-[0_0_30px_rgba(0,0,0,0.5)]
          overflow-hidden px-6 py-8 space-y-5
        "
      >
        {/* Top glow bar */}
        <div className="absolute -top-px left-1/2 -translate-x-1/2 w-[60%] h-px bg-gradient-to-r from-transparent via-cyan-400/70 to-transparent blur-sm" />

        {/* Gradient sheen overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-white/5 to-transparent opacity-30 pointer-events-none" />

        {/* Content */}
        <div className="relative text-center space-y-1">
          <div className="mx-auto size-12 rounded-2xl bg-primary/20 ring-1 ring-border/50 flex items-center justify-center shadow-lg">
            <div className="size-6 rounded-full bg-primary/60" />
          </div>
          <h2 className="text-3xl font-semibold text-white">Set a new password</h2>
          <p className="text-sm text-gray-400">Enter and confirm your new password.</p>
        </div>

        <div className="relative space-y-3">
          <div className="text-left">
            <label className="text-sm text-gray-400">New Password</label>
            <Input
              placeholder="••••••••"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 bg-white/10 border-white/20 placeholder:text-gray-500 text-white"
            />
          </div>
          <div className="text-left">
            <label className="text-sm text-gray-400">Confirm Password</label>
            <Input
              placeholder="••••••••"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-1 bg-white/10 border-white/20 placeholder:text-gray-500 text-white"
            />
          </div>
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}
        {message && <p className="text-emerald-300 text-sm">{message}</p>}

        <Button
          type="submit"
          className="w-full h-11 shadow-lg"
        >
          Set new password
        </Button>

        <p className="text-center text-sm text-gray-400">
          Remembered your password?{" "}
          <Button variant="link" className="hover:text-white" href="/auth/login">
            Sign in
          </Button>
        </p>
      </form>
    </div>
  )
}
