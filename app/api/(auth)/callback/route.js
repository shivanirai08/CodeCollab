import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { syncOAuthUser } from "@/lib/oauthUsers";

export async function GET(req) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/auth-code-error`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/auth/login`);
  }

  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (!userError && user) {
      await syncOAuthUser(user, {
        githubToken: data?.session?.provider_token || null,
      });
    }
  } catch (syncError) {
    console.error("Google OAuth user sync failed:", syncError);
  }

  return NextResponse.redirect(`${origin}/dashboard`);
}
