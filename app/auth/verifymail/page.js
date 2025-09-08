"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabaseClient"
import { toast } from "sonner"

export default function VerifyMailPage() {
  const [resendTimer, setResendTimer] = useState(30)
  const [resending, setResending] = useState(false)
  const searchParams = useSearchParams()
  const router = useRouter()

  //email from signup page
  const email = searchParams.get("email")

  useEffect(() => {
    let timer
    if (resendTimer > 0) {
      timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000)
    }
    return () => clearTimeout(timer)
  }, [resendTimer])

  const handleResend = async () => {
    setResending(true)
    if (!email) {
      toast.error("No email found. Please sign up again.")
      setResending(false)
      return
    }
    // Resend verification email
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
    })
    if (error) {
      toast.error(error.message)
    } else {
      toast.success("Verification email resent. Please check your inbox.")
      setResendTimer(30)
    }
    setResending(false)
  }

  const handleBackToSignup = () => {
    router.push(`/auth/signup?email=${encodeURIComponent(email || "")}`)
  }

  return (
    <div className="relative flex items-center justify-center min-h-screen px-4 bg-gradient-to-b from-background via-background to-[rgba(32,31,44,0.2)]">
      {/* Subtle background glow */}
      <div className="absolute inset-0 -z-10 [background:radial-gradient(ellipse_at_top,rgba(59,130,246,0.15)_0%,transparent_70%)]" />

      <div className="
        relative w-full max-w-md rounded-3xl
        border border-white/10
        bg-white/5 backdrop-blur-2xl
        shadow-[0_0_30px_rgba(0,0,0,0.5)]
        overflow-hidden px-6 py-8 space-y-6
      ">
        {/* Top glow bar */}
        <div className="absolute -top-px left-1/2 -translate-x-1/2 w-[60%] h-px bg-gradient-to-r from-transparent via-cyan-400/70 to-transparent blur-sm" />

        <div className="relative text-center space-y-2">
          <div className="mx-auto size-12 rounded-xl bg-primary/20 ring-1 ring-border/50 flex items-center justify-center shadow-lg">
            <img src="/logo.svg" alt="Logo" className="size-6" />
          </div>
          <h2 className="text-3xl font-semibold text-white">Verify your email</h2>
          <p className="text-sm text-gray-400">
            {email
              ? <>We&apos;ve sent a verification link to <span className="font-medium text-primary">{email}</span>.<br />Please check your inbox and verify to continue.</>
              : <>We&apos;ve sent a verification link to your email.<br />Please check your inbox and verify to continue.</>
            }
          </p>
        </div>


        <div className="flex flex-col gap-3 pt-2">
          <Button
            variant="outline"
            className="w-full"
            onClick={handleBackToSignup}
            type="button"
          >
            Back to Sign Up
          </Button>
          <Button
            className="w-full"
            onClick={handleResend}
            disabled={resendTimer > 0 || resending}
            type="button"
          >
            {resending
              ? "Resending..."
              : resendTimer > 0
                ? `Resend Link (${resendTimer}s)`
                : "Resend Verification Link"}
          </Button>
        </div>
      </div>
    </div>
  )
}
