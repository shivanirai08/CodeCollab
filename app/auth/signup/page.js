"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FcGoogle } from "react-icons/fc";
import { toast } from "sonner";
import { EyeClosed, Eye, Info } from "lucide-react";
import Image from "next/image";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState({ email: false, password: false });
  const [loading, setLoading] = useState(false);
  // for password
  const [visible, setVisible] = useState(false);
  const [showPasswordCriteria, setShowPasswordCriteria] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [hasUpper, setHasUpper] = useState(false);
  const [hasLower, setHasLower] = useState(false);
  const [hasNumber, setHasNumber] = useState(false);
  const [hasSpecial, setHasSpecial] = useState(false);
  const [hasMinLength, setHasMinLength] = useState(false);
  const router = useRouter();


 const handleSignup = async (e) => {
  e.preventDefault();

  if (!email || email.trim() === "" || email.includes(" ")) {
    setError({ email: true });
    toast.error("Enter a valid email address.");
    return;
  }
  if (!password || password.length < 6) {
    setError({ password: true });
    toast.error("Password must be at least 6 characters.");
    return;
  }
  if (!acceptedTerms) {
    toast.error("You must accept the Terms and Conditions to continue.");
    return;
  }

  setLoading(true);

  // 1. Check if user already exists
  // const res = await fetch("/api/checkuser", {
  //   method: "POST",
  //   headers: { "Content-Type": "application/json" },
  //   body: JSON.stringify({ email }),
  // });

  // const { exists } = await res.json();

  // if (exists) {
  //   toast.error("Email already registered. Please sign in instead.");
  //   setLoading(false);
  //   return;
  // }

  // 2. Proceed with Supabase signup
  const res = await fetch('/api/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const data = await res.json()
  if (data.error) toast.error(data.error)
  else{
  toast.success("Signup successful! Please verify your email.");
  router.push(`/auth/verifymail?email=${encodeURIComponent(email)}`);
  setLoading(false);
  }
};



  const handleGoogleLogin = async () => {
    window.location.href = '/api/oauth'
}

  return (
    <div className="relative flex items-center justify-center min-h-screen px-4 bg-gradient-to-b from-background via-background to-[rgba(35, 34, 49, 0.2)]">
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
        <div className="absolute -top-px left-1/2 -translate-x-1/2 w-[60%] h-px bg-gradient-to-r from-transparent via-zinc-100 to-transparent blur-sm" />

        {/* Card content */}
        <div className="relative text-center space-y-1">
          <div className="mx-auto size-12 rounded-xl bg-primary/20 ring-1 ring-border/50 flex items-center justify-center shadow-lg">
            <Image src="/logo.svg" alt="Logo"  width={24} height={24} className="size-6" />
          </div>
          <h2 className="text-3xl font-semibold text-white">
            Create your account
          </h2>
          <p className="text-sm text-gray-400">
            Start collaborating in minutes.
          </p>
        </div>

        <div className="relative space-y-3">
          {/* <div className="text-left">
            <label className="text-sm text-gray-400">Username</label>
            <Input
              placeholder="johndoe"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1 bg-white/5 border-white/20 placeholder:text-gray-500 text-white"
            />
          </div> */}
          <div className="text-left">
            <label className="text-sm text-gray-400">Email</label>
            <Input
              placeholder="you@example.com"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 bg-white/5 border-white/20 placeholder:text-gray-500 text-white"
            />
          </div>
          <div className="text-left relative">
            <label className="flex items-center justify-between text-sm text-gray-400">
              Password
              <div className="flex items-center gap-2">
                {!password ? null : (
                  <span
                    className={
                      passwordStrength <= 2
                        ? "text-red-500"
                        : passwordStrength === 3 || passwordStrength === 4
                        ? "text-yellow-400"
                        : "text-green-400"
                    }
                  >
                    {passwordStrength <= 2
                      ? "Weak"
                      : passwordStrength <= 4
                      ? "Medium"
                      : "Strong"}
                  </span>
                )}
                <button
                  type="button"
                  className="text-zinc-500 hover:text-white bg-zinc-700/50 hover:bg-zinc-700/70 rounded-full size-6 flex items-center justify-center cursor-pointer"
                  onClick={() => setShowPasswordCriteria(!showPasswordCriteria)}
                >
                  <Info className="size-4" />
                </button>
              </div>
            </label>
            <Input
              placeholder="••••••••"
              type={visible ? "text" : "password"}
              value={password}
              onChange={(e) => {
                const val = e.target.value;
                setPassword(val);
                if (error.password)
                  setError((prev) => ({ ...prev, password: false }));
                setHasUpper(/[A-Z]/.test(val));
                setHasLower(/[a-z]/.test(val));
                setHasNumber(/[0-9]/.test(val));
                setHasSpecial(/[!@#$%^&*(),.?":{}|<>]/.test(val));
                setHasMinLength(val.length >= 8);

                // update strength score
                let score = 0;
                if (/[A-Z]/.test(val)) score++;
                if (/[a-z]/.test(val)) score++;
                if (/[0-9]/.test(val)) score++;
                if (/[!@#$%^&*(),.?":{}|<>]/.test(val)) score++;
                if (val.length >= 8) score++;
                setPasswordStrength(score);
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
          {/* Password criteria popup */}
          {showPasswordCriteria && (
            <div className="absolute top-full left-0 mt-1 w-full p-3 bg-background/90 backdrop-filter backdrop-blur-sm text-sm rounded-md shadow-lg border border-gray-700 z-10">
              <p className="mb-1 font-semibold text-gray-300">
                Password must contain:
              </p>
              <ul className="space-y-1 text-gray-400">
                <li className={hasUpper ? "text-green-400" : ""}>
                  • At least 1 uppercase letter
                </li>
                <li className={hasLower ? "text-green-400" : ""}>
                  • At least 1 lowercase letter
                </li>
                <li className={hasNumber ? "text-green-400" : ""}>
                  • At least 1 number
                </li>
                <li className={hasSpecial ? "text-green-400" : ""}>
                  • At least 1 special character
                </li>
                <li className={hasMinLength ? "text-green-400" : ""}>
                  • Minimum 8 characters
                </li>
              </ul>
            </div>
          )}
        </div>

        <label className="flex items-start gap-2 text-sm text-gray-400">
          <input
            type="checkbox"
            checked={acceptedTerms}
            onChange={(e) => setAcceptedTerms(e.target.checked)}
            className="mt-1 size-4 rounded accent-black"
          />
          I agree to the{" "}
          <a href="#" className="underline ml-1 hover:text-white">
            Terms and Conditions
          </a>{" "}
          and
          <a href="#" className="underline ml-1 hover:text-white">
            Privacy Policy
          </a>
          .
        </label>

        <Button type="submit" className="w-full h-11 shadow-lg">
          {loading ? "Creating account..." : "Create account"}
        </Button>

        <div className="relative flex items-center justify-center">
          <span className="h-px flex-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          <span className="relative z-2 mx-3 rounded-full px-3 py-0.5 text-xs text-gray-300">
            OR
          </span>
          <span className="h-px flex-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
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
          <Button
            type="button"
            variant="link"
            className="hover:text-white"
            onClick={() => {
              router.push("/auth/login");
            }}
          >
            Sign in
          </Button>
        </p>
      </form>
    </div>
  );
}
