// app/api/checkuser/route.js
import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(req) {
  try {
    const { email } = await req.json()

    const { data, error } = await supabase.auth.admin.listUsers()

    if (error) {
      console.error("Supabase error:", error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    const exists = data.users.some((user) => user.email === email)

    return NextResponse.json({ exists })
  } catch (err) {
    console.error("Route error:", err)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}
