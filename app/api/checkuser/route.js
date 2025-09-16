import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req) {
  try {
    const { email } = await req.json();

    // Look for the email in our public.users mirror
    const { data, error } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .maybeSingle(); // returns null if not found

    if (error) throw error;

    return new Response(
      JSON.stringify({ exists: !!data }),
      { status: 200 }
    );
  } catch (err) {
    console.error("CheckUser API error:", err);
    return new Response(
      JSON.stringify({ error: "Internal Server Error" }),
      { status: 500 }
    );
  }
}
