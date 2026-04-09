import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureProjectAccess } from "@/lib/projectAccess";
import { getInternalBackendHeaders } from "@/lib/projectRepository";

const backendUrl =
  process.env.CODECOLLAB_BACKEND_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "http://localhost:5000";

export const runtime = "nodejs";

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
    const relativePath = (searchParams.get("path") || "").trim();

    if (!relativePath) {
      return NextResponse.json(
        { error: "Query parameter 'path' is required." },
        { status: 400 }
      );
    }

    const response = await fetch(
      `${backendUrl}/projects/${id}/git/diff?path=${encodeURIComponent(relativePath)}`,
      {
        method: "GET",
        headers: getInternalBackendHeaders(),
        cache: "no-store",
      }
    );

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      return NextResponse.json(
        { error: result.error || "Failed to load file diff" },
        { status: response.status || 500 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to load file diff" },
      { status: 500 }
    );
  }
}
