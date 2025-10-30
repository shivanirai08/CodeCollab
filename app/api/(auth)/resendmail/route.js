import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/client";

export async function POST(request) {
  const { email } = await request.json();
  const supabase = await createClient();

  // Send verification email
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/auth/callback`,
    },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ success: true });
}