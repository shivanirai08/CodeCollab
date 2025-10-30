import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req, { params: paramsPromise }) {
  try {
    const { id } = await paramsPromise;
    const supabase = await createClient();

    if (!id) {
      return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
    }

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();

    // Fetch project
    const { data: projectData, error: projectError } = await supabase
      .from("projects")
      .select("id, title, description, visibility, join_code, template, language, owner_id")
      .eq("id", id)
      .single();

    if (projectError) {
      return NextResponse.json({ error: projectError.message }, { status: 400 });
    }

    // Compute permissions
    const isOwner = user && projectData.owner_id === user.id;
    let isCollaborator = false;

    if (user && !isOwner) {
      const { data: member } = await supabase
        .from("project_members")
        .select("role")
        .eq("project_id", id)
        .eq("user_id", user.id)
        .single();

      isCollaborator = !!member;
    }

    const canEdit = isOwner || isCollaborator;
    const canView = projectData.visibility === "public" || canEdit;

    if (!canView) {
      return NextResponse.json({ error: "You don't have permission to view this project" }, { status: 403 });
    }

    const response = {
      project: {
        projectid: projectData.id,
        projectname: projectData.title,
        description: projectData.description,
        visibility: projectData.visibility,
        join_code: projectData.join_code,
        template: projectData.template,
        language: projectData.language,
        owner_id: projectData.owner_id,
      },
      permissions: { canEdit, canView, isOwner, isCollaborator },
    };

    return NextResponse.json(response);
  } catch (err) {
    return NextResponse.json(
      { error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
