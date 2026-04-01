"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { Eye, EyeOff, Pencil, Camera, Loader2, Mail, Lock, ArrowRight } from "lucide-react"
import Image from "next/image"

export default function SettingsPage() {
  const router = useRouter()
  const [userData, setUserData] = useState(null)
  const [loading, setLoading] = useState(true)

  // Avatar
  const fileInputRef = useRef(null)
  const [avatarUploading, setAvatarUploading] = useState(false)

  // Username inline edit
  const [editingUsername, setEditingUsername] = useState(false)
  const [username, setUsername] = useState("")
  const [usernameLoading, setUsernameLoading] = useState(false)
  const usernameInputRef = useRef(null)

  // Password — option A: verify + change inline
  // Password
  const [currentPassword, setCurrentPassword] = useState("")
  const [showCurrent, setShowCurrent] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [emailLoading, setEmailLoading] = useState(false)

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch("/api/user")
        const data = await res.json()
        if (data.user) {
          setUserData(data.user)
          setUsername(data.user.username || "")
        }
      } catch {
        toast.error("Failed to load profile")
      } finally {
        setLoading(false)
      }
    }
    fetchUser()
  }, [])

  useEffect(() => {
    if (editingUsername && usernameInputRef.current) {
      usernameInputRef.current.focus()
      usernameInputRef.current.select()
    }
  }, [editingUsername])

  // ── Avatar upload ──────────────────────────────────────────────
  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarUploading(true)
    try {
      const formData = new FormData()
      formData.append("avatar", file)
      const res = await fetch("/api/user/avatar", { method: "POST", body: formData })
      const data = await res.json()
      if (data.error) {
        toast.error(data.error)
      } else {
        setUserData((prev) => ({ ...prev, avatar_url: data.avatar_url }))
        toast.success("Avatar updated!")
      }
    } catch {
      toast.error("Failed to upload avatar.")
    } finally {
      setAvatarUploading(false)
      e.target.value = ""
    }
  }

  // ── Username save ──────────────────────────────────────────────
  const saveUsername = async () => {
    const trimmed = username.trim()
    if (trimmed === userData?.username) {
      setEditingUsername(false)
      return
    }
    setUsernameLoading(true)
    try {
      const res = await fetch("/api/user", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: trimmed }),
      })
      const data = await res.json()
      if (data.error) {
        toast.error(data.error)
        setUsername(userData?.username || "")
      } else {
        setUserData((prev) => ({ ...prev, username: trimmed }))
        toast.success("Username updated!")
        setEditingUsername(false)
      }
    } catch {
      toast.error("Something went wrong.")
    } finally {
      setUsernameLoading(false)
    }
  }

  const handleUsernameKeyDown = (e) => {
    if (e.key === "Enter") saveUsername()
    if (e.key === "Escape") {
      setUsername(userData?.username || "")
      setEditingUsername(false)
    }
  }

  // ── Password: verify current + change ─────────────────────────
  // ── Password: verify current → redirect to newpwd ──────────────
  const handleVerifyAndRedirect = async () => {
    if (!currentPassword) { toast.error("Enter your current password."); return }
    setPasswordLoading(true)
    try {
      const { createClient } = await import("@/lib/supabase/client")
      const supabase = createClient()
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: userData.email,
        password: currentPassword,
      })
      if (signInError) {
        toast.error("Current password is incorrect.")
        return
      }
      router.push("/auth/newpwd")
    } catch {
      toast.error("Something went wrong.")
    } finally {
      setPasswordLoading(false)
    }
  }

  // ── Password: send reset email ─────────────────────────────────
  const handleSendResetEmail = async () => {
    if (!userData?.email) return
    setEmailLoading(true)
    try {
      const res = await fetch("/api/resetpwd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userData.email }),
      })
      const data = await res.json()
      if (data.error) {
        toast.error(data.error)
      } else {
        toast.success(`Reset link sent to ${userData.email}`)
      }
    } catch {
      toast.error("Failed to send reset email.")
    } finally {
      setEmailLoading(false)
    }
  }

  const initials = userData?.username
    ? userData.username.slice(0, 2).toUpperCase()
    : "??"

  return (
    <div className="max-w-2xl mx-auto py-8 px-2 md:px-0 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your account and preferences</p>
      </div>

      {/* ── Profile Card ─────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-xl p-6 flex items-center gap-5">
        {/* Avatar with camera overlay */}
        <div className="relative flex-shrink-0">
          <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center text-xl font-bold overflow-hidden select-none">
            {loading ? (
              <span className="text-sm text-muted-foreground">…</span>
            ) : userData?.avatar_url ? (
              <Image
                src={userData.avatar_url}
                alt="avatar"
                width={64}
                height={64}
                className="w-full h-full object-cover"
              />
            ) : (
              initials
            )}
          </div>
          {/* Camera button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={avatarUploading}
            className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:opacity-80 transition-opacity disabled:opacity-50"
            title="Change avatar"
          >
            {avatarUploading ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Camera size={12} />
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={handleAvatarChange}
          />
        </div>

        {/* Username inline edit */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {editingUsername ? (
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <Input
                  ref={usernameInputRef}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyDown={handleUsernameKeyDown}
                  onBlur={saveUsername}
                  maxLength={15}
                  className="h-8 text-base font-semibold py-0"
                  disabled={usernameLoading}
                />
                {usernameLoading && <Loader2 size={14} className="animate-spin text-muted-foreground flex-shrink-0" />}
              </div>
            ) : (
              <>
                <p className="font-semibold text-lg truncate">
                  {loading ? "Loading…" : userData?.username ?? "—"}
                </p>
                <button
                  onClick={() => setEditingUsername(true)}
                  className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                  title="Edit username"
                >
                  <Pencil size={14} />
                </button>
              </>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5 truncate">
            {loading ? "—" : userData?.email ?? "—"}
          </p>
        </div>
      </div>

      {/* ── Change Password ───────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-6 pt-5 pb-4 border-b border-border flex items-center gap-2">
          <Lock size={16} className="text-muted-foreground" />
          <h2 className="font-semibold">Change Password</h2>
        </div>
        <div className="px-6 py-5">
          <p className="text-xs text-muted-foreground mb-6">
            Verify your current password to set a new one, or get a reset link sent to{" "}
            <span className="text-foreground">{userData?.email ?? "your email"}</span>.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 mt-2">
            {/* Current password input */}
            <div className="relative flex-1 min-w-0">
              <Input
                type={showCurrent ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleVerifyAndRedirect()}
                placeholder="Current password"
                className="pr-10"
                disabled={passwordLoading}
              />
              <button
                type="button"
                onClick={() => setShowCurrent(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {/* Verify & redirect */}
            <Button
              onClick={handleVerifyAndRedirect}
              disabled={passwordLoading || !currentPassword}
              className="shrink-0"
            >
              {passwordLoading
                ? <><Loader2 size={14} className="animate-spin mr-1.5" />Verifying…</>
                : <>Continue</>}
            </Button>
            {/* Divider */}
            {/* <span className="hidden sm:flex items-center text-xs text-muted-foreground select-none">or</span> */}
            {/* Send reset link */}
            <Button
              variant="outline"
              onClick={handleSendResetEmail}
              disabled={emailLoading || !userData?.email}
              className="shrink-0 border-gray-200"
            >
              {emailLoading
                ? <><Loader2 size={14} className="animate-spin mr-1.5" />Sending…</>
                : <><Mail size={14} className="mr-1.5" />Send Reset Link</>}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

