"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

export default function VerifyOtpPage() {
  const [otp, setOtp] = useState(["", "", "", ""])
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState("")
  const inputRefs = useRef([])
  const router = useRouter()

  useEffect(() => {
    // Get email from localStorage or URL params (you can modify this based on your flow)
    const storedEmail = localStorage.getItem("signup_email")
    if (storedEmail) {
      setEmail(storedEmail)
    }
  }, [])

  const handleOtpChange = (index, value) => {
    if (value.length > 1) return // Prevent multiple characters
    
    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)

    // Auto-focus next input
    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4)
    const newOtp = [...otp]
    for (let i = 0; i < pastedData.length && i < 4; i++) {
      newOtp[i] = pastedData[i]
    }
    setOtp(newOtp)
    
    // Focus the next empty input or the last one
    const nextIndex = Math.min(pastedData.length, 3)
    inputRefs.current[nextIndex]?.focus()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setMessage("")
    setLoading(true)
    
    const otpString = otp.join("")
    
    try {
      // Replace with your OTP verification logic
      if (otpString.length !== 4) {
        setError("Please enter a valid 4-digit OTP.")
      } else {
        await new Promise((res) => setTimeout(res, 1000))
        setMessage("OTP verified successfully!")
        // Redirect to dashboard or next step
        setTimeout(() => {
          router.push("/dashboard")
        }, 1500)
      }
    } catch (err) {
      setError("Failed to verify OTP. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleBackToSignup = () => {
    router.push("/auth/signup")
  }

  return (
    <div className="relative flex items-center justify-center min-h-screen px-4 bg-gradient-to-b from-background via-background to-black">
      {/* Subtle background glow */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.15),transparent_70%)]" />

      <form
        onSubmit={handleSubmit}
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

        {/* Back button */}
        <div className="relative">
          <Button
            type="button"
            variant="ghost"
            onClick={handleBackToSignup}
            className="absolute left-0 top-0 p-2 text-gray-400 hover:text-white hover:bg-white/10"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Button>
        </div>

        {/* Content */}
        <div className="relative text-center space-y-1">
          <div className="mx-auto size-12 rounded-2xl bg-primary/20 ring-1 ring-border/50 flex items-center justify-center shadow-lg">
            <div className="size-6 rounded-full bg-primary/60" />
          </div>
          <h2 className="text-3xl font-semibold text-white">Verify your account</h2>
          <p className="text-sm text-gray-400">
            Enter the 4-digit code sent to your email.
          </p>
          {email && (
            <p className="text-sm text-cyan-400 font-medium">
              {email}
            </p>
          )}
        </div>

        {/* OTP Input Boxes */}
          <div className="flex justify-center gap-8">
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => (inputRefs.current[index] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleOtpChange(index, e.target.value.replace(/\D/g, ""))}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={handlePaste}
                className="
                  w-12 h-12 text-center text-xl font-semibold
                  rounded-md border border-white/20 bg-white/10
                  text-white focus:outline-none focus:ring-1 
                 transition-all duration-200
                "
                autoComplete="off"
              />
            ))}
          </div>

        {error && <p className="text-red-400 text-sm text-center">{error}</p>}
        {message && <p className="text-emerald-300 text-sm text-center">{message}</p>}

        <Button
          type="submit"
          className="w-full h-11 shadow-lg"
          disabled={loading || otp.join("").length !== 4}
        >
          {loading ? "Verifying..." : "Verify Code"}
        </Button>

        <div className="relative text-center">
          <span className="absolute left-0 right-0 top-1/2 -z-10 h-px bg-white/10" />
          <span className="bg-background/60 px-3 text-xs text-gray-400">OR</span>
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full h-11 border-white/20 hover:bg-white/10 text-white"
          onClick={handleBackToSignup}
        >
          Back to Sign Up
        </Button>

        <p className="text-center text-sm text-gray-400">
          Didn't receive the code?{" "}
          <Button
            type="button"
            variant="link"
            className="hover:text-white text-sm p-0 h-auto"
            onClick={() => setMessage("A new OTP has been sent to your email.")}
          >
            Resend OTP
          </Button>
        </p>
      </form>
    </div>
  )
}

