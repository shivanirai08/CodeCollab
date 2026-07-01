import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createGitErrorResponse } from "@/lib/gitActionErrors";
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
    const { filePath, strategy } = body;

    if (!filePath || typeof filePath !== "string") {
      return NextResponse.json({ error: "Missing parameter: filePath" }, { status: 400 });
    }

    if (!strategy || !["ours", "theirs"].includes(strategy)) {
      return NextResponse.json(
        { error: "Invalid parameter: strategy must be 'ours' or 'theirs'" },
        { status: 400 }
      );
    }

    const response = await fetch(`${backendUrl}/projects/${id}/git/resolve-conflict`, {
      method: "POST",
      headers: getInternalBackendHeaders(),
      body: JSON.stringify({ filePath, strategy }),
      cache: "no-store",
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorResponse = createGitErrorResponse(result, response.status || 500, "resolve-conflict");
      return NextResponse.json(errorResponse.body, { status: errorResponse.status });
    }

    return NextResponse.json(result);
  } catch (error) {
    const errorResponse = createGitErrorResponse({ error: error.message }, 500, "resolve-conflict");
    return NextResponse.json(errorResponse.body, { status: errorResponse.status });
  }
}
