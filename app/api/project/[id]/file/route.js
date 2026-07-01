import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureProjectAccess } from "@/lib/projectAccess";
import { getInternalBackendHeaders } from "@/lib/projectRepository";

const backendUrl =
  process.env.CODECOLLAB_BACKEND_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "http://localhost:5000";

export const runtime = "nodejs";

/**
 * GET /api/project/:id/file?path=src/App.jsx
 * Reads file content from the repository worktree.
 */
export async function GET(req, { params: paramsPromise }) {
  try {
    const { id } = await paramsPromise;
    const supabase = await createClient(req);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const access = await ensureProjectAccess({
      projectId: id,
      userId: user?.id || null,
      requireView: true,
    });

    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const { searchParams } = new URL(req.url);
    const filePath = (searchParams.get("path") || "").trim();

    if (!filePath) {
      return NextResponse.json({ error: "Query parameter 'path' is required." }, { status: 400 });
    }

    const response = await fetch(
      `${backendUrl}/projects/${id}/file?path=${encodeURIComponent(filePath)}`,
      {
        method: "GET",
        headers: getInternalBackendHeaders(),
        cache: "no-store",
      }
    );

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      return NextResponse.json(
        { error: result.error || "Failed to read file" },
        { status: response.status || 500 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
  }
}

/**
 * POST /api/project/:id/file
 * Autosave: writes file content to the repo worktree and syncs the node in DB.
 * Only users with edit access can save.
 */
export async function POST(req, { params: paramsPromise }) {
  try {
    const { id } = await paramsPromise;
    const supabase = await createClient(req);
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
      requireEdit: true,
    });

    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const body = await req.json().catch(() => ({}));
    const { filePath, content } = body;

    if (!filePath || typeof filePath !== "string") {
      return NextResponse.json({ error: "Missing parameter: filePath" }, { status: 400 });
    }

    if (typeof content !== "string") {
      return NextResponse.json({ error: "Missing parameter: content" }, { status: 400 });
    }

    const response = await fetch(`${backendUrl}/projects/${id}/file`, {
      method: "POST",
      headers: getInternalBackendHeaders(),
      body: JSON.stringify({ filePath, content }),
      cache: "no-store",
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      return NextResponse.json(
        { error: result.error || "Failed to save file" },
        { status: response.status || 500 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
  }
}
