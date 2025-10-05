"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Image from "next/image";
import { toast } from "sonner";
import { FcGoogle } from "react-icons/fc";
import { EyeClosed, Eye } from "lucide-react";
import { useDispatch } from "react-redux";
import { setUser } from "@/store/authSlice";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState({ email: false, password: false });
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(false);
  const router = useRouter();
  const dispatch = useDispatch();

  const handleLogin = async (e) => {
  e.preventDefault();
  if (!email || email.trim() === "" || email.includes(" ")) {
    setError({ email: true, password: false });
    toast.error("Email is required.");
    return;
  }
  if (!password || password.trim() === "") {
    setError({ email: false, password: true });
    toast.error("Password is required.");
    return;
  }

  setLoading(true);

  const res = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const data = await res.json()
  if (data.error){
    toast.error("Invalid email or password.");
    setError({ email: true, password: true });
    setLoading(false);
    return;
  }
  else{
  setLoading(false);
  toast.success("Logged in successfully!");
  router.push('/dashboard');
 }
}

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  const handleResetPassword = () => {
    router.push(`/auth/resetpwd`);
  };

  return (
    <div className="relative flex items-center justify-center min-h-screen px-4 bg-gradient-to-b from-background via-background to-[rgba(32,31,44,0.2)]">
      {/* Subtle background glow */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.15),transparent_70%)]" />

      <form
        onSubmit={handleLogin}
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
            <Image
              src="/logo.svg"
              alt="Logo"
              width={24}
              height={24}
              className="size-6"
            />
          </div>
          <h2 className="text-3xl font-semibold text-white">Welcome back</h2>
          <p className="text-sm text-gray-400">
            Please enter your details to sign in.
          </p>
        </div>

        <div className="relative space-y-3">
          <div className="text-left">
            <label className="text-sm text-gray-400">Email</label>
            <Input
              placeholder="you@example.com"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error.email)
                  setError((prev) => ({ ...prev, email: false }));
              }}
              className="mt-1 bg-white/5 border-white/20 placeholder:text-gray-500 text-white"
              aria-invalid={error.email}
            />
          </div>
          <div className="text-left relative">
            <label className="text-sm text-gray-400">Password</label>
            <Input
              placeholder="••••••••"
              type={visible ? "text" : "password"}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error.password)
                  setError((prev) => ({ ...prev, password: false }));
              }}
              className="mt-1 bg-white/5 border-white/20 placeholder:text-gray-500 text-white"
              aria-invalid={error.password}
            />
            {visible ? (
              <Eye
                className="size-5 text-gray-400 absolute right-3 top-[38px] cursor-pointer"
                onClick={() => setVisible(false)}
              />
            ) : (
              <EyeClosed
                className="size-5 text-gray-400 absolute right-3 top-[38px] cursor-pointer"
                onClick={() => setVisible(true)}
              />
            )}
          </div>
          <div className="flex items-center justify-between pt-1">
            <label className="inline-flex items-center gap-2 text-sm text-gray-400">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="size-4 rounded accent-black"
              />
              Remember me
            </label>
            <Button
              type="button"
              variant="link"
              onClick={handleResetPassword}
              className="text-sm text-gray-300 hover:text-white"
            >
              Forgot password?
            </Button>
          </div>
        </div>

        <Button className="w-full h-11 shadow-lg">
          {loading ? "Signing in..." : "Sign in"}
        </Button>

        <div className="relative flex items-center justify-center">
          <span className="h-px flex-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          <span className="relative z-10 mx-3 rounded-full px-3 py-0.5 text-xs text-gray-300">
            OR
          </span>
          <span className="h-px flex-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={handleGoogleLogin}
          className="w-full h-11 border-white/20 hover:bg-white/10 text-white"
        >
          <FcGoogle className="size-5" />
          Continue with Google
        </Button>

        <p className="text-center text-sm text-gray-400">
          Don&apos;t have an account?{" "}
          <Button
            type="button"
            variant="link"
            className="hover:text-white"
            onClick={() => {
              router.push("/auth/signup");
            }}
          >
            Create Account
          </Button>
        </p>
      </form>
    </div>
  );
}
