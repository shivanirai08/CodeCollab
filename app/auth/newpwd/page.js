"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import Image from "next/image";

export default function NewPwdPage() {
  const [password, setPassword] = useState("")
  const [error, setError] = useState({pwd:false , confirmpwd: false})
  const [confirmPassword, setConfirmPassword] = useState("")
  const router = useRouter()

  const handleNewPassword = async (e) => {
    e.preventDefault()
    if(!password){
      setError({pwd:true , confirmpwd: false})
      toast.error("Password is required.")
      return
    }
    if(!confirmPassword){
      setError({pwd:false , confirmpwd: true})
      toast.error("Confirm Password is required.")
      return
    }
    if (password !== confirmPassword) {
      setError({pwd:true , confirmpwd: true})
      toast.error("Passwords do not match.")
      return
    }
    // Calling pwd api
    const res = await fetch("/api/newpwd",{
      method : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    })
    const data = await res.json();
    if (data.error) toast.error(data.error)
    else {
      toast.success("Password updated successfully. Redirecting to login...")
      setTimeout(() => {
        router.push("/auth/login")
      }, 1000)
    }
  }

  return (
    <div className="relative flex items-center justify-center min-h-screen px-4 bg-gradient-to-b from-background via-background to-[rgba(32,31,44,0.2)]">
      {/* Subtle background glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(81, 246, 59, 1),rgba(19, 89, 10, 1))]" />

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
        <div className="absolute -top-px left-1/2 -translate-x-1/2 w-[60%] h-px bg-gradient-to-r from-transparent via-zinc-100 to-transparent blur-sm" />

        {/* Content */}
        <div className="relative text-center space-y-1">
          <div className="mx-auto size-12 rounded-xl bg-primary/20 ring-1 ring-border/50 flex items-center justify-center shadow-lg">
            <Image src="/logo.svg" alt="Logo"  width={24} height={24} className="size-6" />
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
              onChange={(e) => {setPassword(e.target.value); setError({...error, pwd: false})}}
              className="mt-1 bg-white/5 border-white/20 placeholder:text-gray-500 text-white"
              aria-invalid={error.pwd}
            />
          </div>
          <div className="text-left">
            <label className="text-sm text-gray-400">Confirm Password</label>
            <Input
              placeholder="••••••••"
              type="password"
              value={confirmPassword}
              onChange={(e) => {setConfirmPassword(e.target.value); setError({...error, confirmpwd: false})}}
              className="mt-1 bg-white/5 border-white/20 placeholder:text-gray-500 text-white"
              aria-invalid={error.confirmpwd}
            />
          </div>
        </div>

        <Button
          type="submit"
          className="w-full h-11 shadow-lg"
        >
          Set new password
        </Button>

        <p className="text-center text-sm text-gray-400">
          Remember your password?{" "}
          <Button variant="link" className="hover:text-white" onClick = {() => {router.push("/auth/login")}}>
            Sign in
          </Button>
        </p>
      </form>
    </div>
  )
}
