import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createClient } from "@supabase/supabase-js"
import { createServerClient } from "@/lib/supabase-server"

// Service role client for privileged DB access
const serviceClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(req) {
  try {
    const { joinCode } = await req.json()

    if (typeof joinCode !== "string" || !/^[a-f0-9]{8}$/.test(joinCode)) {
      return NextResponse.json(
        { error: "Invalid project code format" },
        { status: 400 }
      )
    }

    // Resolve user from Authorization header or cookies
    const cookieStore = cookies()
    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization")
    const bearerToken = authHeader?.toLowerCase().startsWith("bearer ")
      ? authHeader.slice(7).trim()
      : null
    const cookieToken = cookieStore.get("sb-access-token")?.value || null

    let currentUserId = null

    if (bearerToken || cookieToken) {
      const token = bearerToken || cookieToken
      const tempClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      )
      const { data: userFromToken } = await tempClient.auth.getUser(token)
      currentUserId = userFromToken?.user?.id || null
    } else {
      // Fallback to cookie-based session with our server client
      const serverClient = createServerClient(cookieStore)
      const { data: authData } = await serverClient.auth.getUser()
      currentUserId = authData?.user?.id || null
    }

    if (!currentUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Find project by join code
    const { data: project, error: projectError } = await serviceClient
      .from("projects")
      .select("id, owner_id, visibility, title")
      .eq("join_code", joinCode)
      .single()

    if (projectError) {
      return NextResponse.json({ error: "Project lookup failed" }, { status: 400 })
    }
    if (!project) {
      return NextResponse.json(
        { error: "No project found for this code" },
        { status: 404 }
      )
    }

    // Check if already a member
    const { data: existingMembership } = await serviceClient
      .from("project_members")
      .select("id, role")
      .eq("project_id", project.id)
      .eq("user_id", currentUserId)
      .maybeSingle()

    if (existingMembership) {
      return NextResponse.json({ joined: true, message: "Already a member" })
    }

    const isPublic = (project.visibility || "").toLowerCase() === "public"

    if (isPublic) {
      // Join immediately as collaborator
      const { error: insertError } = await serviceClient
        .from("project_members")
        .insert({ project_id: project.id, user_id: currentUserId, role: "collaborator" })

      if (insertError) {
        return NextResponse.json(
          { error: "Failed to join project" },
          { status: 400 }
        )
      }
      return NextResponse.json({ joined: true })
    }

    // Non-public project: notify owner
    // Try to fetch owner email
    const { data: ownerUser, error: ownerError } = await serviceClient.auth.admin.getUserById(
      project.owner_id
    )

    if (ownerError) {
      // Still return generic success message to avoid leaking details
      return NextResponse.json({ joined: false, message: "Owner has been notified" })
    }

    const ownerEmail = ownerUser?.user?.email

    // Optional: webhook for sending email notifications
    const webhookUrl = process.env.JOIN_REQUEST_WEBHOOK_URL

    if (webhookUrl && ownerEmail) {
      try {
        await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "join_request",
            projectId: project.id,
            projectTitle: project.title,
            ownerId: project.owner_id,
            ownerEmail,
            requesterId: currentUserId,
            joinCode,
          }),
        })
      } catch (_) {
        // Ignore webhook failures; return generic response
      }
    }

    return NextResponse.json({ joined: false, message: "Request sent to owner" })
  } catch (err) {
    console.error("/api/join error", err)
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    )
  }
}


