import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getProjectContext,
  JOIN_REQUEST_STATUS,
  normalizeAccessType,
} from "@/lib/projectAccess";

export async function GET(req, { params: paramsPromise }) {
  try {
    const { id } = await paramsPromise;
    const supabase = await createClient(req);
    const admin = createAdminClient();

    if (!id) {
      return NextResponse.json(
        { error: "Project ID is required" },
        { status: 400 }
      );
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const context = await getProjectContext(id, user?.id || null);

    if (!context?.project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    let latestRequest = null;

    if (user?.id && !context.permissions.isMember && context.project.owner_id !== user.id) {
      const { data: request } = await admin
        .from("project_join_requests")
        .select("id, status, access_type, requested_at, reviewed_at")
        .eq("project_id", id)
        .eq("requester_id", user.id)
        .order("requested_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (request) {
        latestRequest = {
          id: request.id,
          status: request.status,
          accessType: normalizeAccessType(request.access_type),
          requestedAt: request.requested_at,
          reviewedAt: request.reviewed_at,
        };
      }
    }

    return NextResponse.json({
      project: {
        projectid: context.project.id,
        projectname: context.project.title,
        description: context.project.description,
        visibility: context.project.visibility,
        join_code: context.project.join_code,
        owner_id: context.project.owner_id,
      },
      permissions: {
        canEdit: context.permissions.canEdit,
        canView: context.permissions.canView,
        isOwner: context.permissions.isOwner,
        isMember: context.permissions.isMember,
        isCollaborator: context.permissions.isCollaborator,
        isViewer: context.permissions.isViewer,
      },
      accessRequest: latestRequest,
      accessState: context.permissions.isMember
        ? "member"
        : latestRequest?.status || "not_joined",
    });
  } catch (err) {
    console.error("Error fetching project:", err);
    return NextResponse.json(
      { error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
