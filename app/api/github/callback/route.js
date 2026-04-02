import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeNextPath } from "@/lib/github";
import { syncOAuthUser } from "@/lib/oauthUsers";
import { createClient } from "@/lib/supabase/server";

async function exchangeGitHubCodeForToken({ code, redirectUri, state }) {
  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: redirectUri,
      state,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Failed to exchange GitHub OAuth code.");
  }

  const data = await response.json();

  if (!data.access_token) {
    throw new Error(data.error_description || "GitHub access token missing.");
  }

  return data.access_token;
}

export async function GET(req) {
  const url = new URL(req.url);
  const origin = url.origin;
  const mode = url.searchParams.get("mode") === "connect" ? "connect" : "auth";
  const next = normalizeNextPath(url.searchParams.get("next"));
  const code = url.searchParams.get("code");
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || origin;

  if (!code) {
    return NextResponse.redirect(`${origin}${next}`);
  }

  if (mode === "connect") {
    const cookieStore = await cookies();
    const state = url.searchParams.get("state");
    const storedState = cookieStore.get("github_oauth_state")?.value;
    const redirectUri = `${baseUrl}/api/github/callback?mode=connect&next=${encodeURIComponent(
      next
    )}`;

    const response = NextResponse.redirect(`${origin}${next}`);
    response.cookies.set("github_oauth_state", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });

    if (!state || !storedState || state !== storedState) {
      return response;
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.redirect(`${origin}/auth/login`);
    }

    try {
      const githubToken = await exchangeGitHubCodeForToken({
        code,
        redirectUri,
        state,
      });
      const supabaseAdmin = createAdminClient();
      const { error } = await supabaseAdmin
        .from("users")
        .update({ github_token: githubToken })
        .eq("id", user.id);

      if (error) {
        throw error;
      }
    } catch (syncError) {
      console.error("GitHub connect sync failed:", syncError);
    }

    return response;
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
    console.error("GitHub OAuth user sync failed:", syncError);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
