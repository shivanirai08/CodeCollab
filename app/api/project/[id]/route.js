import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req, { params: paramsPromise }) {
  try {
    const { id } = await paramsPromise;
    const supabase = await createClient();

    if (!id) {
      return NextResponse.json(
        { error: "Project ID is required" },
        { status: 400 }
      );
    }

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Fetch project
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("*")
      .eq("id", id)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    // Determine role
    let isOwner = false;
    let isCollaborator = false;

    if (user) {
        const { data: membership } = await supabase
          .from("project_members")
          .select("role")
          .eq("project_id", id)
          .eq("user_id", user.id)
          .single();

        isCollaborator = !!membership;
        isOwner = project.owner_id === user.id;
    }

    const canEdit = isOwner || isCollaborator;
    const canView = project.visibility === "public" || canEdit;

    if (!canView) {
      return NextResponse.json(
        { error: "You don't have permission to view this project" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      project: {
        projectid: project.id,
        projectname: project.title,
        description: project.description,
        visibility: project.visibility,
        join_code: project.join_code,
        owner_id: project.owner_id,
      },
      permissions: {
        canEdit,
        canView,
        isOwner,
        isCollaborator,
      },
    });
  } catch (err) {
    console.error("Error fetching project:", err);
    return NextResponse.json(
      { error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
