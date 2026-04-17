import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createGitErrorResponse } from "@/lib/gitActionErrors";
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
    const admin = createAdminClient();
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

    let githubToken = null;
    if (user?.id) {
      const { data: profile } = await admin
        .from("users")
        .select("github_token")
        .eq("id", user.id)
        .maybeSingle();

      githubToken = profile?.github_token || null;
    }

    const response = await fetch(`${backendUrl}/projects/${id}/git/status`, {
      method: "GET",
      headers: {
        ...getInternalBackendHeaders(),
        ...(githubToken ? { "x-github-token": githubToken } : {}),
      },
      cache: "no-store",
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorResponse = createGitErrorResponse(result, response.status || 500, "status");
      return NextResponse.json(errorResponse.body, { status: errorResponse.status });
    }

    return NextResponse.json(result);
  } catch (error) {
    const errorResponse = createGitErrorResponse({ error: error.message }, 500, "status");
    return NextResponse.json(errorResponse.body, { status: errorResponse.status });
  }
}
