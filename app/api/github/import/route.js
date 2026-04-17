import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getInternalBackendHeaders } from "@/lib/projectRepository";

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

async function cleanupImportedProject(admin, projectId) {
  try {
    await admin.from("nodes").delete().eq("project_id", projectId);
  } catch {}

  try {
    await admin.from("project_members").delete().eq("project_id", projectId);
  } catch {}

  try {
    await admin.from("project_repositories").delete().eq("project_id", projectId);
  } catch {}

  try {
    await admin.from("projects").delete().eq("id", projectId);
  } catch {}
}

export async function POST(req) {
  try {
    const supabase = await createClient(req);
    const admin = createAdminClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

    const { data: project, error: projectError } = await admin
      .from("projects")
      .insert({
        title: repo.name.trim(),
        description: repo.description?.trim() || `Imported from ${repo.fullName}`,
        visibility: repo.private ? "private" : "public",
        owner_id: user.id,
      })
      .select()
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { error: projectError?.message || "Failed to create project." },
        { status: 400 }
      );
    }

    const { error: memberError } = await admin.from("project_members").insert({
      project_id: project.id,
      user_id: user.id,
      role: "owner",
    });

    if (memberError) {
      await cleanupImportedProject(admin, project.id);
      return NextResponse.json(
        { error: memberError.message || "Failed to attach project membership." },
        { status: 400 }
      );
    }

    const importResponse = await fetch(`${backendUrl}/github/import`, {
      method: "POST",
      headers: getInternalBackendHeaders(),
      body: JSON.stringify({
        projectId: project.id,
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
      await cleanupImportedProject(admin, project.id);
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
        message: "Repository imported successfully.",
        project,
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
