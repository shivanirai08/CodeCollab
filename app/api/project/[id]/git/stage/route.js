import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureProjectAccess } from "@/lib/projectAccess";
import { getInternalBackendHeaders } from "@/lib/projectRepository";

const backendUrl =
  process.env.CODECOLLAB_BACKEND_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "http://localhost:5000";

export const runtime = "nodejs";

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

    const response = await fetch(`${backendUrl}/projects/${id}/git/stage`, {
      method: "POST",
      headers: getInternalBackendHeaders(),
      body: JSON.stringify(body || {}),
      cache: "no-store",
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      return NextResponse.json(
        { error: result.error || "Failed to stage changes" },
        { status: response.status || 500 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to stage changes" },
      { status: 500 }
    );
  }
}
