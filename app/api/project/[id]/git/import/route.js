import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureProjectAccess } from "@/lib/projectAccess";
import { getInternalBackendHeaders, getProjectRepository } from "@/lib/projectRepository";

const backendUrl =
  process.env.CODECOLLAB_BACKEND_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "http://localhost:5000";

function normalizeBackendError(errorValue) {
  if (!errorValue) {
    return "Failed to import repository.";
  }

  if (typeof errorValue !== "string") {
    return errorValue.message || "Failed to import repository.";
  }

  try {
    const parsed = JSON.parse(errorValue);
    if (parsed?.message) {
      return parsed.message;
    }
  } catch {}

  return errorValue;
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

    const existingRepository = await getProjectRepository(id).catch(() => null);
    if (existingRepository?.is_connected) {
      return NextResponse.json(
        { error: "This project already has a connected repository." },
        { status: 409 }
      );
    }

    const { count: nodeCount, error: nodesError } = await admin
      .from("nodes")
      .select("id", { count: "exact", head: true })
      .eq("project_id", id);

    if (nodesError) {
      return NextResponse.json(
        { error: nodesError.message || "Failed to inspect current workspace." },
        { status: 500 }
      );
    }

    if ((nodeCount || 0) > 0) {
      return NextResponse.json(
        {
          error:
            "This project already has files. Safe repo import is only enabled for empty projects right now.",
        },
        { status: 409 }
      );
    }

    const body = await req.json();
    const repo = body?.repo;

    if (!repo?.name || !repo?.fullName) {
      return NextResponse.json(
        { error: "Repository details are required." },
        { status: 400 }
      );
    }

    const { data: userData, error: githubError } = await admin
      .from("users")
      .select("github_token")
      .eq("id", user.id)
      .single();

    if (githubError || !userData?.github_token) {
      return NextResponse.json(
        { error: "GitHub is not connected for this account." },
        { status: 400 }
      );
    }

    const importResponse = await fetch(`${backendUrl}/github/import`, {
      method: "POST",
      headers: getInternalBackendHeaders(),
      body: JSON.stringify({
        projectId: id,
        userId: user.id,
        githubToken: userData.github_token,
        repo: {
          githubRepoId: repo.id || null,
          name: repo.name,
          fullName: repo.fullName,
          repoUrl: repo.htmlUrl || null,
          private: Boolean(repo.private),
          defaultBranch: repo.defaultBranch || null,
          cloneUrl: repo.cloneUrl || null,
        },
      }),
      cache: "no-store",
    });

    const importResult = await importResponse.json().catch(() => ({}));

    if (!importResponse.ok) {
      return NextResponse.json(
        {
          error: normalizeBackendError(
            importResult.error || "Failed to import repository."
          ),
        },
        { status: importResponse.status || 500 }
      );
    }

    return NextResponse.json(
      {
        message: "Repository imported into this project.",
        import: importResult,
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to import repository." },
      { status: 500 }
    );
  }
}
