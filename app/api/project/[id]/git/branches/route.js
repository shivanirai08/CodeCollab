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
      requireEdit: false,
    });

    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const response = await fetch(`${backendUrl}/projects/${id}/git/branches`, {
      method: "GET",
      headers: getInternalBackendHeaders(),
      cache: "no-store",
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorResponse = createGitErrorResponse(result, response.status || 500, "branches");
      return NextResponse.json(errorResponse.body, { status: errorResponse.status });
    }

    return NextResponse.json(result);
  } catch (error) {
    const errorResponse = createGitErrorResponse({ error: error.message }, 500, "branches");
    return NextResponse.json(errorResponse.body, { status: errorResponse.status });
  }
}

export async function POST(req, { params: paramsPromise }) {
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
      requireEdit: true,
    });

    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const body = await req.json().catch(() => ({}));
    const { name, startPoint, pushToOrigin } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Missing parameter: name" }, { status: 400 });
    }

    const { data: profile, error: profileError } = await admin
      .from("users")
      .select("github_token")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError || !profile?.github_token) {
      return NextResponse.json(
        { error: "GitHub is not connected for this account." },
        { status: 400 }
      );
    }

    const response = await fetch(`${backendUrl}/projects/${id}/git/branches`, {
      method: "POST",
      headers: getInternalBackendHeaders(),
      body: JSON.stringify({
        name,
        startPoint: typeof startPoint === "string" ? startPoint : undefined,
        pushToOrigin: Boolean(pushToOrigin),
        githubToken: profile.github_token,
      }),
      cache: "no-store",
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorResponse = createGitErrorResponse(result, response.status || 500, "branches");
      return NextResponse.json(errorResponse.body, { status: errorResponse.status });
    }

    return NextResponse.json(result);
  } catch (error) {
    const errorResponse = createGitErrorResponse({ error: error.message }, 500, "branches");
    return NextResponse.json(errorResponse.body, { status: errorResponse.status });
  }
}
