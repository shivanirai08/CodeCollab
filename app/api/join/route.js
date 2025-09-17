import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Service role client (for DB access)
const serviceClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// regular server client (for auth verification)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function POST(req) {
  try {
    // const { joinCode , userId } = await req.json()
    // const currentUserId = userId

    const authHeader = req.headers.get("authorization");
    const token = authHeader?.split(" ")[1];

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // validate user with access token
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { joinCode } = await req.json();
    const currentUserId = user.id;

    if (typeof joinCode !== "string" || !/^[a-f0-9]{8}$/.test(joinCode)) {
      return NextResponse.json(
        { error: "Invalid project code format" },
        { status: 400 }
      );
    }

    if (!currentUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // --- Look up project ---
    const { data: project, error: projectError } = await serviceClient
      .from("projects")
      .select("id, owner_id, visibility, title")
      .eq("join_code", joinCode)
      .maybeSingle();

    if (projectError) {
      return NextResponse.json(
        { error: "Project lookup failed" },
        { status: 400 }
      );
    }
    if (!project) {
      return NextResponse.json({ error: "No project found" }, { status: 404 });
    }

    // --- Check membership ---
    const { data: existingMembership } = await serviceClient
      .from("project_members")
      .select("id, role")
      .eq("project_id", project.id)
      .eq("user_id", currentUserId)
      .maybeSingle();

    if (existingMembership) {
      if (
        existingMembership.role === "owner" ||
        project.owner_id === currentUserId
      ) {
        return NextResponse.json({
          joined: false,
          message: "You are the owner of this project",
        });
      }
      return NextResponse.json({
        joined: false,
        message: "Already a member of this project",
      });
    }

    // --- Public project? ---
    if ((project.visibility || "").toLowerCase() === "public") {
      const { error: insertError } = await serviceClient
        .from("project_members")
        .insert({
          project_id: project.id,
          user_id: currentUserId,
          role: "collaborator",
        });

      if (insertError) {
        return NextResponse.json(
          { error: "Failed to join project" },
          { status: 400 }
        );
      }
      return NextResponse.json({
        joined: true,
        message: "Joined the project successfully",
      });
    }

    // --- Private project: notify owner ---
    const { data: ownerUser } = await serviceClient.auth.admin.getUserById(
      project.owner_id
    );
    const ownerEmail = ownerUser?.user?.email;

    if (process.env.JOIN_REQUEST_WEBHOOK_URL && ownerEmail) {
      await fetch(process.env.JOIN_REQUEST_WEBHOOK_URL, {
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
      }).catch(() => {});
    }

    return NextResponse.json({
      joined: false,
      message: "Request sent to owner",
    });
  } catch (err) {
    console.error("/api/join error", err);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
