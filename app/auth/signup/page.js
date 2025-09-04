"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FcGoogle } from "react-icons/fc"

export default function SignupPage() {
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
//   const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [error, setError] = useState(null)
  const router = useRouter()

  const handleSignup = async (e) => {
    e.preventDefault()
    // if (!acceptedTerms) {
    //   setError("You must accept the Terms and Conditions to continue.")
    //   return
    // }
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username },
      },
    })
    if (error) setError(error.message)
    else router.push("/dashboard")
  }

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: "http://localhost:3000/dashboard" },
    })
  }

  return (
    <div className="relative flex items-center justify-center min-h-screen px-4 bg-gradient-to-b from-background via-background to-black">
      {/* Subtle background glow */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.15),transparent_70%)]" />

      <form
        onSubmit={handleSignup}
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

        {/* Card content */}
        <div className="relative text-center space-y-1">
          <div className="mx-auto size-12 rounded-2xl bg-primary/20 ring-1 ring-border/50 flex items-center justify-center shadow-lg">
            <div className="size-6 rounded-full bg-primary/60" />
          </div>
          <h2 className="text-3xl font-semibold text-white">Create your account</h2>
          <p className="text-sm text-gray-400">Start collaborating in minutes.</p>
        </div>

        <div className="relative space-y-3">
          <div className="text-left">
            <label className="text-sm text-gray-400">Username</label>
            <Input
              placeholder="johndoe"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1 bg-white/10 border-white/20 placeholder:text-gray-500 text-white"
            />
          </div>
          <div className="text-left">
            <label className="text-sm text-gray-400">Email</label>
            <Input
              placeholder="you@example.com"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 bg-white/10 border-white/20 placeholder:text-gray-500 text-white"
            />
          </div>
          <div className="text-left">
            <label className="text-sm text-gray-400">Password</label>
            <Input
              placeholder="••••••••"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 bg-white/10 border-white/20 placeholder:text-gray-500 text-white"
            />
          </div>
        </div>


        {/* <label className="flex items-start gap-2 text-xs text-gray-400">
          <input
            type="checkbox"
            checked={acceptedTerms}
            onChange={(e) => setAcceptedTerms(e.target.checked)}
            className="mt-0.5 size-4 rounded border-white/20 bg-white/5"
            />
          I agree to the <a href="#" className="underline ml-1 hover:text-white">Terms and Conditions</a> and
          <a href="#" className="underline ml-1 hover:text-white">Privacy Policy</a>.
        </label> */}

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <Button
          type="submit"
          className="w-full h-11 shadow-lg"
        >
          Create account
        </Button>

        <div className="relative text-center">
          <span className="absolute left-0 right-0 top-1/2 -z-10 h-px bg-white/10" />
          <span className="bg-background/60 px-3 text-xs text-gray-400">OR</span>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={handleGoogleLogin}
          className="w-full h-11 border-white/20 hover:bg-white/10 text-white flex items-center justify-center gap-2"
        >
          <FcGoogle className="size-5" /> Continue with Google
        </Button>

        <p className="text-center text-sm text-gray-400">
          Already have an account?{" "}
          <Button variant="link" className="hover:text-white" href="/auth/login">
            Sign in
          </Button>
        </p>
      </form>
    </div>
  )
}
