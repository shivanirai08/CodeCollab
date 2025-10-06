"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const handleAuthCallback = async () => {
      const supabase = createClient();

      // Parse the fragment (the part after #)
      const { data, error } = await supabase.auth.getSessionFromUrl({ storeSession: true });

      if (!error) {
        // Now user is signed in and session is stored
        router.replace("/dashboard");
      } else {
        console.error("Auth callback error:", error.message);
        router.replace("/login");
      }
    };

    handleAuthCallback();
  }, [router]);

  return <p className="text-center mt-10">Completing sign-in...</p>;
}
