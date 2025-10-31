"use client";

import { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeClosed, Lock, Check, X } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Suspense } from "react";
import { showLoader, hideLoader } from "@/store/LoadingSlice";

function NewPasswordContent() {
  const dispatch = useDispatch();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);

  // Password validation requirements
  const requirements = [
    { label: "8+ characters", test: (pwd) => pwd.length >= 8 },
    { label: "Upper & lowercase", test: (pwd) => /[A-Z]/.test(pwd) && /[a-z]/.test(pwd) },
    { label: "Contains number", test: (pwd) => /\d/.test(pwd) },
    { label: "Special character", test: (pwd) => /[!@#$%^&*(),.?":{}|<>]/.test(pwd) },
  ];

  const allRequirementsMet = requirements.every((req) => req.test(password));

  useEffect(() => {
    const verifyCode = async () => {
      dispatch(showLoader("Verifying reset link"));
      const supabase = createClient();
      
      // First check if we already have a session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        // Already have a valid session, skip code exchange
        setIsVerifying(false);
        dispatch(hideLoader());
        return;
      }

      // If no session, try to exchange the code
      const code = searchParams.get("code");
      
      if (!code) {
        dispatch(hideLoader());
        toast.error("Invalid reset link. Please request a new one.");
        router.push("/auth/login");
        return;
      }

      try {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
          console.error("Exchange code error:", error);
          dispatch(hideLoader());
          toast.error("Invalid or expired reset link.");
          router.push("/auth/login");
          return;
        }

        if (data?.session) {
          setIsVerifying(false);
          dispatch(hideLoader());
        } else {
          dispatch(hideLoader());
          toast.error("Failed to establish session.");
          router.push("/auth/login");
        }
      } catch (error) {
        console.error("Error verifying code:", error);
        dispatch(hideLoader());
        toast.error("Failed to verify reset link.");
        router.push("/auth/login");
      }
    };

    verifyCode();
  }, [searchParams, router, dispatch]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!allRequirementsMet) {
      toast.error("Please meet all password requirements");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setIsLoading(true);
    dispatch(showLoader("Updating password"));

    try {
      // Update password using client-side Supabase
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        throw new Error(error.message);
      }

      toast.success("Password updated successfully!");
      
      // Sign out the user after password update
      await supabase.auth.signOut();
      
      dispatch(hideLoader());
      setTimeout(() => {
        router.push("/auth/login");
      }, 1000);
    } catch (error) {
      dispatch(hideLoader());
      toast.error(error.message || "Failed to update password");
      console.error("Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isVerifying) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-card p-6 md:p-8 rounded-xl shadow-xl border border-border">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <Lock className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
              Set New Password
            </h1>
            <p className="text-sm text-muted-foreground">
              Create a strong password for your account
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* New Password */}
            <div className="flex flex-col gap-2">
              <label htmlFor="password" className="text-sm font-medium text-foreground">
                New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter new password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 h-11"
                  disabled={isLoading}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  disabled={isLoading}
                  tabIndex={-1}
                >
                  {showPassword ? <Eye className="h-4 w-4" /> : <EyeClosed className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="flex flex-col gap-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10 pr-10 h-11"
                  disabled={isLoading}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  disabled={isLoading}
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <Eye className="h-4 w-4" /> : <EyeClosed className="h-4 w-4" />}
                </button>
              </div>

              {/* Password Match Indicator */}
              {confirmPassword && (
                <div
                  className={`flex items-center gap-2 text-xs mt-1 ${
                    password === confirmPassword
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {password === confirmPassword ? (
                    <>
                      <Check className="h-3 w-3" />
                      <span>Passwords match</span>
                    </>
                  ) : (
                    <>
                      <X className="h-3 w-3" />
                      <span>Passwords do not match</span>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Password Requirements - 2x2 Grid (Always visible) */}
            <div className="bg-muted/50 rounded-lg border border-border p-3">
              <p className="text-xs font-medium text-muted-foreground mb-2.5">
                Password requirements:
              </p>
              <div className="grid grid-cols-2 gap-2">
                {requirements.map((requirement, index) => {
                  const isMet = requirement.test(password);
                  return (
                    <div
                      key={index}
                      className={`flex items-center gap-2 text-xs transition-all ${
                        isMet ? "text-green-600 dark:text-green-400" : "text-muted-foreground"
                      }`}
                    >
                      <div className="flex items-center justify-center w-4 h-4 rounded-full flex-shrink-0 transition-all">
                        {isMet ? (
                          <Check className="h-3 w-3 text-green-600 dark:text-green-400" />
                        ) : (
                          <X className="h-3 w-3 text-muted-foreground" />
                        )}
                      </div>
                      <span className="leading-tight">{requirement.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full h-11 mt-1"
              disabled={isLoading || !allRequirementsMet || password !== confirmPassword}
            >
              {isLoading ? "Updating Password..." : "Update Password"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function NewPasswordPage() {
  return (
    <Suspense fallback={null}>
      <NewPasswordContent />
    </Suspense>
  );
}
