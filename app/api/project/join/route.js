import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getProjectContext,
  JOIN_REQUEST_STATUS,
  MEMBER_ROLE,
  normalizeAccessType,
  toDatabaseAccessType,
  toDatabaseMemberRole,
} from "@/lib/projectAccess";
import { createNotification } from "@/lib/notifications";
import { sendProjectAccessEmail } from "@/lib/email";
import { rateLimit, getClientIp } from "@/lib/rateLimit";

const joinRequestLimiter = rateLimit({
  interval: 10 * 60 * 1000,
  uniqueTokenPerInterval: 50,
});

async function getCurrentUserProfile(admin, userId) {
  const { data } = await admin
    .from("users")
    .select("id, username, email, avatar_url")
    .eq("id", userId)
    .maybeSingle();

  if (data?.email) {
    return data;
  }

  const {
    data: { user },
    error,
  } = await admin.auth.admin.getUserById(userId);

  if (error || !user) {
    return data;
  }

  return {
    id: data?.id || user.id,
    username:
      data?.username ||
      user.user_metadata?.username ||
      user.email?.split("@")[0] ||
      "User",
    email: data?.email || user.email || "",
    avatar_url:
      data?.avatar_url ||
      user.user_metadata?.avatar_url ||
      user.user_metadata?.picture ||
      null,
  };
}

export async function POST(req) {
  try {
    const supabase = await createClient(req);
    const admin = createAdminClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ip = getClientIp(req);
    try {
      await joinRequestLimiter.check(5, `${ip}:${user.id}`);
    } catch (error) {
      return NextResponse.json(
        {
          error: "Too many join requests. Please try again later.",
          retryAfter: error.retryAfter,
        },
        { status: 429 }
      );
    }

    const body = await req.json();
    const requestedAccess = normalizeAccessType(
      body?.accessType || MEMBER_ROLE.COLLABORATOR
    );

    if (
      ![MEMBER_ROLE.COLLABORATOR, MEMBER_ROLE.VIEWER].includes(requestedAccess)
    ) {
      return NextResponse.json(
        { error: "Access type must be viewer or collaborator" },
        { status: 400 }
      );
    }

    let projectId = body?.projectId || null;

    if (!projectId && body?.joinCode) {
      const joinCode = String(body.joinCode).trim().toLowerCase();

      if (!/^[a-f0-9]{8}$/.test(joinCode)) {
        return NextResponse.json(
          { error: "Invalid project code format" },
          { status: 400 }
        );
      }

      const { data: projectByCode } = await admin
        .from("projects")
        .select("id")
        .eq("join_code", joinCode)
        .maybeSingle();

      projectId = projectByCode?.id || null;
    }

    if (!projectId) {
      return NextResponse.json(
        { error: "Project identifier is required" },
        { status: 400 }
      );
    }

    const context = await getProjectContext(projectId, user.id);

    if (!context?.project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const { project, membership } = context;

    if (project.owner_id === user.id || context.permissions.isOwner) {
      return NextResponse.json(
        { error: "Project owner cannot request access" },
        { status: 400 }
      );
    }

    if (membership) {
      return NextResponse.json(
        {
          error: "You are already a member of this project",
          state: "member",
          projectId: project.id,
        },
        { status: 409 }
      );
    }

    const { data: existingPendingRequest } = await admin
      .from("project_join_requests")
      .select("id, status, access_type")
      .eq("project_id", project.id)
      .eq("requester_id", user.id)
      .eq("status", JOIN_REQUEST_STATUS.PENDING)
      .maybeSingle();

    if (existingPendingRequest) {
      return NextResponse.json(
        {
          error: "You already have a pending request for this project",
          state: JOIN_REQUEST_STATUS.PENDING,
          request: {
            id: existingPendingRequest.id,
            status: existingPendingRequest.status,
            accessType: normalizeAccessType(existingPendingRequest.access_type),
          },
        },
        { status: 409 }
      );
    }

    const requesterProfile = await getCurrentUserProfile(admin, user.id);

    if ((project.visibility || "").toLowerCase() === "public") {
      const { error: insertError } = await admin
        .from("project_members")
        .insert({
          project_id: project.id,
          user_id: user.id,
          role: toDatabaseMemberRole(MEMBER_ROLE.COLLABORATOR),
        });

      if (insertError) {
        return NextResponse.json(
          { error: insertError.message || "Failed to join project" },
          { status: 400 }
        );
      }

      await createNotification({
        userId: project.owner_id,
        type: "request_approved",
        title: `${requesterProfile?.username || "A user"} joined your project`,
        message: `${requesterProfile?.username || "A user"} joined "${project.title}" directly because it is public.`,
        metadata: {
          projectId: project.id,
          requesterId: user.id,
          autoApproved: true,
        },
      });

      return NextResponse.json({
        joined: true,
        state: "member",
        message: "Joined the project successfully",
        projectId: project.id,
      });
    }

    const { data: joinRequest, error: joinRequestError } = await admin
      .from("project_join_requests")
      .insert({
        project_id: project.id,
        requester_id: user.id,
        status: JOIN_REQUEST_STATUS.PENDING,
        access_type: toDatabaseAccessType(requestedAccess),
      })
      .select()
      .single();

    if (joinRequestError) {
      return NextResponse.json(
        { error: joinRequestError.message || "Failed to create join request" },
        { status: 400 }
      );
    }

    await createNotification({
      userId: project.owner_id,
      type: "join_request",
      title: `${requesterProfile?.username || "A user"} requested access`,
      message: `${requesterProfile?.username || "A user"} requested ${requestedAccess} access to "${project.title}".`,
      metadata: {
        projectId: project.id,
        requesterId: user.id,
        requestId: joinRequest.id,
        accessType: requestedAccess,
      },
    });

    const ownerProfile = await getCurrentUserProfile(admin, project.owner_id);

    await sendProjectAccessEmail({
      event: "join_request_created",
      project: {
        id: project.id,
        title: project.title,
      },
      owner: ownerProfile,
      requester: requesterProfile,
      joinRequest: {
        id: joinRequest.id,
        accessType: requestedAccess,
        status: joinRequest.status,
      },
    });

    return NextResponse.json({
      joined: false,
      state: JOIN_REQUEST_STATUS.PENDING,
      message: "Request sent",
      request: {
        id: joinRequest.id,
        status: joinRequest.status,
        accessType: requestedAccess,
      },
    });
  } catch (err) {
    console.error("POST /api/project/join failed:", err);
    return NextResponse.json(
      { error: err.message || "Something went wrong" },
      { status: 500 }
    );
  }
}
