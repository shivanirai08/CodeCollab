import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureProjectAccess, getNodeWithProject } from "@/lib/projectAccess";

async function getNodeAccess(nodeId, userId, requireEdit = false) {
  const node = await getNodeWithProject(nodeId);

  if (!node?.projects?.id) {
    return {
      ok: false,
      status: 404,
      error: "Node not found",
    };
  }

  const access = await ensureProjectAccess({
    projectId: node.projects.id,
    userId,
    requireView: true,
    requireEdit,
  });

  if (!access.ok) {
    return access;
  }

  return {
    ok: true,
    node,
    context: access.context,
  };
}

export async function GET(req, { params: paramsPromise }) {
  try {
    const { nodeId } = await paramsPromise;
    const supabase = await createClient(req);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!nodeId) {
      return NextResponse.json({ error: "Node id required" }, { status: 400 });
    }

    const access = await getNodeAccess(nodeId, user?.id || null, false);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    return NextResponse.json({ node: access.node });
  } catch (err) {
    return NextResponse.json(
      { error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function PATCH(req, { params: paramsPromise }) {
  try {
    const { nodeId } = await paramsPromise;
    const supabase = await createClient(req);
    const admin = createAdminClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!nodeId) {
      return NextResponse.json({ error: "Node id required" }, { status: 400 });
    }

    const access = await getNodeAccess(nodeId, user.id, true);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const updates = await req.json();

    const { data, error } = await admin
      .from("nodes")
      .update(updates)
      .eq("id", nodeId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ node: data });
  } catch (err) {
    return NextResponse.json(
      { error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req, { params: paramsPromise }) {
  try {
    const { nodeId } = await paramsPromise;
    const supabase = await createClient(req);
    const admin = createAdminClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!nodeId) {
      return NextResponse.json({ error: "Node id required" }, { status: 400 });
    }

    const access = await getNodeAccess(nodeId, user.id, true);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const { error } = await admin.from("nodes").delete().eq("id", nodeId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
