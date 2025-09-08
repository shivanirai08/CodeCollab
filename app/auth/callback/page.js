// app/auth/callback/page.js
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useDispatch } from "react-redux";
import { setUser } from "@/store/authSlice";
import Cookies from "js-cookie";

export default function CallbackPage() {
  const router = useRouter();
  const dispatch = useDispatch();

  useEffect(() => {
    const process = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const user = {
          email: session.user.email,
          id: session.user.id,
          token: session.access_token,
        };
        dispatch(setUser(user));
        Cookies.set("sb-access-token", user.token, { secure: true, sameSite: "strict" });

        await supabase.from("users").upsert({
          id: session.user.id,
          email: session.user.email,
        });

        router.push("/dashboard");
      } else {
        router.push("/auth/login");
      }
    };

    process();
  }, [dispatch, router]);

  return <p className="flex items-center justify-center">Finishing login...</p>;
}
