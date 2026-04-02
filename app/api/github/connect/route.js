import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { normalizeNextPath } from "@/lib/github";

export async function GET(req) {
  const url = new URL(req.url);
  const origin = url.origin;
  const mode = url.searchParams.get("mode") === "connect" ? "connect" : "auth";
  const next = normalizeNextPath(url.searchParams.get("next"));
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || origin;

  if (mode === "connect") {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.redirect(`${origin}/auth/login`);
    }

    if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) {
      return NextResponse.redirect(`${origin}${next}`);
    }

    const state = crypto.randomUUID();
    const redirectUri = `${baseUrl}/api/github/callback?mode=connect&next=${encodeURIComponent(
      next
    )}`;
    const githubUrl = new URL("https://github.com/login/oauth/authorize");

    githubUrl.searchParams.set("client_id", process.env.GITHUB_CLIENT_ID);
    githubUrl.searchParams.set("redirect_uri", redirectUri);
    githubUrl.searchParams.set("scope", "read:user user:email repo");
    githubUrl.searchParams.set("state", state);

    const response = NextResponse.redirect(githubUrl.toString());
    response.cookies.set("github_oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 10,
    });

    return response;
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "github",
    options: {
      redirectTo: `${baseUrl}/api/github/callback?mode=auth&next=${encodeURIComponent(
        next
      )}`,
      scopes: "read:user user:email repo",
    },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (data?.url) {
    return NextResponse.redirect(data.url);
  }

  return NextResponse.json({ error: "OAuth URL not found" }, { status: 500 });
}
