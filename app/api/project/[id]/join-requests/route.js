import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  ensureProjectAccess,
  normalizeAccessType,
  JOIN_REQUEST_STATUS,
} from "@/lib/projectAccess";

export async function GET(req, { params: paramsPromise }) {
  try {
    const { id } = await paramsPromise;
    const supabase = await createClient(req);
    const admin = createAdminClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const access = await ensureProjectAccess({
      projectId: id,
      userId: user.id,
    });

    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    if (!access.context.permissions.isOwner) {
      return NextResponse.json(
        { error: "Only the project owner can view join requests" },
        { status: 403 }
      );
    }

    const { data, error } = await admin
      .from("project_join_requests")
      .select(
        `
        id,
        project_id,
        requester_id,
        status,
        access_type,
        requested_at,
        reviewed_at,
        reviewed_by,
        users!project_join_requests_requester_id_fkey (
          id,
          username,
          email,
          avatar_url
        )
      `
      )
      .eq("project_id", id)
      .eq("status", JOIN_REQUEST_STATUS.PENDING)
      .order("requested_at", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const requests = (data || []).map((request) => ({
      id: request.id,
      projectId: request.project_id,
      requesterId: request.requester_id,
      status: request.status,
      accessType: normalizeAccessType(request.access_type),
      requestedAt: request.requested_at,
      reviewedAt: request.reviewed_at,
      requester: request.users
        ? {
            id: request.users.id,
            username: request.users.username,
            email: request.users.email,
            avatar_url: request.users.avatar_url,
          }
        : null,
    }));

    return NextResponse.json({ requests });
  } catch (error) {
    console.error("GET join requests failed:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
