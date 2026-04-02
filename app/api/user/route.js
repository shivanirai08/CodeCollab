import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Disable static optimization for auth-dependent routes
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function PUT(req) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { username, password } = body;

    // Update password via Supabase Auth if provided
    if (password) {
      if (password.length < 6) {
        return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
      }
      const { error: pwError } = await supabase.auth.updateUser({ password });
      if (pwError) {
        return NextResponse.json({ error: pwError.message }, { status: 400 });
      }
      // If only password update, return early
      if (!username) {
        return NextResponse.json({ message: "Password updated successfully." });
      }
    }

    // Update username in users table if provided
    if (username) {
      if (username.trim().length === 0) {
        return NextResponse.json({ error: "Username cannot be empty." }, { status: 400 });
      }
      if (username.length > 15) {
        return NextResponse.json({ error: "Username must be less than 15 characters." }, { status: 400 });
      }
      if (!username.match(/^[a-zA-Z0-9_]+$/)) {
        return NextResponse.json({ error: "Username can only contain letters, numbers, and underscores." }, { status: 400 });
      }

      // Check if username is already taken
      const { data: existing } = await supabase
        .from("users")
        .select("id")
        .eq("username", username)
        .neq("id", user.id)
        .maybeSingle();

      if (existing) {
        return NextResponse.json({ error: "Username already taken." }, { status: 409 });
      }

      const { error: updateError } = await supabase
        .from("users")
        .update({ username })
        .eq("id", user.id);

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ message: "Profile updated successfully." });
  } catch (err) {
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function GET(req) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    const { data, error } = await supabase
      .from("users")
      .select("id, email, username, avatar_url")
      .eq("id", user.id)
      .single();

    if (error) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    return NextResponse.json(
      { user: data },
      {
        status: 200,
        headers: {
          'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        },
      }
    );
  } catch (err) {
    return NextResponse.json(
      { error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}