import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  ensureProjectAccess,
  JOIN_REQUEST_STATUS,
  MEMBER_ROLE,
  normalizeAccessType,
  normalizeMemberRole,
  toDatabaseMemberRole,
} from "@/lib/projectAccess";
import { createNotification } from "@/lib/notifications";
import { sendProjectAccessEmail } from "@/lib/email";

export async function PATCH(req, { params: paramsPromise }) {
  try {
    const { requestId } = await paramsPromise;
    const supabase = await createClient(req);
    const admin = createAdminClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const action = body?.action;
    const requestedRole = normalizeMemberRole(
      body?.role || MEMBER_ROLE.COLLABORATOR
    );

    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { error: "Action must be approve or reject" },
        { status: 400 }
      );
    }

    if (
      action === "approve" &&
      ![MEMBER_ROLE.COLLABORATOR, MEMBER_ROLE.VIEWER].includes(requestedRole)
    ) {
      return NextResponse.json(
        { error: "Approved role must be viewer or collaborator" },
        { status: 400 }
      );
    }

    const { data: requestRecord, error: requestError } = await admin
      .from("project_join_requests")
      .select(
        `
        id,
        project_id,
        requester_id,
        status,
        access_type,
        projects!inner (
          id,
          title,
          owner_id
        ),
        users!project_join_requests_requester_id_fkey (
          id,
          username,
          email
        )
      `
      )
      .eq("id", requestId)
      .maybeSingle();

    if (requestError) {
      return NextResponse.json({ error: requestError.message }, { status: 400 });
    }

    if (!requestRecord) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    const projectId = requestRecord.project_id;
    const access = await ensureProjectAccess({
      projectId,
      userId: user.id,
    });

    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    if (!access.context.permissions.isOwner) {
      return NextResponse.json(
        { error: "Only the project owner can review join requests" },
        { status: 403 }
      );
    }

    if (requestRecord.status !== JOIN_REQUEST_STATUS.PENDING) {
      return NextResponse.json(
        { error: "This request has already been reviewed" },
        { status: 409 }
      );
    }

    const { data: reviewerProfile } = await admin
      .from("users")
      .select("id, username, email")
      .eq("id", user.id)
      .maybeSingle();

    let requesterProfile = requestRecord.users || null;

    if (!requesterProfile?.email) {
      const { data: requesterProfileFallback } = await admin
        .from("users")
        .select("id, username, email")
        .eq("id", requestRecord.requester_id)
        .maybeSingle();

      requesterProfile = requesterProfileFallback || requesterProfile;
    }

    if (action === "approve") {
      const { data: existingMembership } = await admin
        .from("project_members")
        .select("id")
        .eq("project_id", projectId)
        .eq("user_id", requestRecord.requester_id)
        .maybeSingle();

      if (!existingMembership) {
        const { error: memberInsertError } = await admin
          .from("project_members")
          .insert({
            project_id: projectId,
            user_id: requestRecord.requester_id,
            role: toDatabaseMemberRole(requestedRole),
          });

        if (memberInsertError) {
          return NextResponse.json(
            { error: memberInsertError.message || "Failed to add project member" },
            { status: 400 }
          );
        }
      }
    }

    const finalStatus =
      action === "approve"
        ? JOIN_REQUEST_STATUS.APPROVED
        : JOIN_REQUEST_STATUS.REJECTED;

    const { error: updateError } = await admin
      .from("project_join_requests")
      .update({
        status: finalStatus,
        reviewed_at: new Date().toISOString(),
        reviewed_by: user.id,
      })
      .eq("id", requestId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    const finalRole = action === "approve"
      ? requestedRole
      : normalizeAccessType(requestRecord.access_type);

    await createNotification({
      userId: requestRecord.requester_id,
      type: action === "approve" ? "request_approved" : "request_rejected",
      title:
        action === "approve"
          ? `Request accepted for "${requestRecord.projects.title}"`
          : `Request rejected for "${requestRecord.projects.title}"`,
      message:
        action === "approve"
          ? `${reviewerProfile?.username || "The project owner"} accepted your request for ${finalRole} access.`
          : `${reviewerProfile?.username || "The project owner"} rejected your request for ${finalRole} access.`,
      metadata: {
        projectId,
        requestId,
        role: finalRole,
      },
    });

    await sendProjectAccessEmail({
      event: action === "approve" ? "join_request_approved" : "join_request_rejected",
      project: requestRecord.projects,
      requester: requesterProfile,
      reviewer: reviewerProfile || null,
      joinRequest: {
        id: requestId,
        status: finalStatus,
        accessType: finalRole,
      },
    });

    return NextResponse.json({
      success: true,
      status: finalStatus,
      role: finalRole,
    });
  } catch (error) {
    console.error("PATCH join request failed:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
