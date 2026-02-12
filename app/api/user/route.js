import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Disable static optimization for auth-dependent routes
export const dynamic = 'force-dynamic';
export const revalidate = 0;

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