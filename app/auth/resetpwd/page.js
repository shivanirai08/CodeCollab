"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Image from "next/image";

export default function ResetPwd() {
  const [email, setEmail] = useState("");
  const [countdown, setCountdown] = useState(0);
  const router = useRouter();

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleResetPassword = async (e) => {
    e.preventDefault();
    
    if (!email) {
      toast.error("Enter your email to reset your password.");
      return;
    }

    if (countdown > 0) {
      toast.error(`Please wait ${countdown} seconds before resending.`);
      return;
    }

    try {
      // calling resetpwd api
      const res = await fetch("/api/resetpwd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      
      const data = await res.json();
      
      if (data.error) {
        toast.error(data.error);
      } else {
        toast.success("Password reset link sent. Check your inbox.");
        setCountdown(60); 
      }
    } catch (error) {
      toast.error("Failed to send reset link. Please try again.");
      console.error("Reset password error:", error);
    }
  };

  return (
    <div className="relative flex items-center justify-center min-h-screen px-4 bg-gradient-to-b from-background via-background to-[rgba(32,31,44,0.2)]">
      {/* Subtle background glow */}
      <div className="absolute inset-0 -z-10 [background:radial-gradient(ellipse_at_top,rgba(59,130,246,0.15)_0%,transparent_70%)]" />

      <form
        onSubmit={handleResetPassword}
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

        {/* Card content */}
        <div className="relative text-center space-y-1">
          <div className="mx-auto size-12 rounded-xl bg-primary/20 ring-1 ring-border/50 flex items-center justify-center shadow-lg">
            <Image src="/logo.svg" alt="Logo" width={24} height={24} className="size-6" />
          </div>
          <h2 className="text-3xl font-semibold text-white">Reset your password</h2>
          <p className="text-sm text-gray-400">Enter your email to receive a reset link.</p>
        </div>

        <div className="relative space-y-3">
          <div className="text-left">
            <label className="text-sm text-gray-400">Email</label>
            <Input
              placeholder="you@example.com"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 bg-white/5 border-white/20 placeholder:text-gray-500 text-white"
              disabled={countdown > 0}
            />
          </div>
        </div>

        <Button
          type="submit"
          className="w-full h-11 shadow-lg"
          disabled={countdown > 0}
        >
          {countdown > 0 ? `Resend link in ${countdown}s` : "Send reset link"}
        </Button>

        <p className="text-center text-sm text-gray-400">
          Remembered your password?{" "}
          <Button
            type="button"
            variant="link"
            className="hover:text-white p-0 h-auto"
            onClick={() => router.push("/auth/login")}
          >
            Sign in
          </Button>
        </p>
      </form>
    </div>
  );
}
