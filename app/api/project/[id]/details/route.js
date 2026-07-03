import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(req, { params: paramsPromise }) {
  try {
    const { id } = await paramsPromise;
    const supabase = await createClient(req);
    const body = await req.json();
    const projectName = body.projectName?.trim();
    const description = body.description?.trim() ?? "";

    if (!id) {
      return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
    }

    if (!projectName) {
      return NextResponse.json({ error: "Project name is required" }, { status: 400 });
    }

    if (projectName.length > 20) {
      return NextResponse.json(
        { error: "Project name can be up to 20 characters" },
        { status: 400 }
      );
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: project } = await supabase
      .from("projects")
      .select("owner_id")
      .eq("id", id)
      .single();

    if (!project || project.owner_id !== user.id) {
      return NextResponse.json(
        { error: "Only the project owner can update project details" },
        { status: 403 }
      );
    }

    const { data, error } = await supabase
      .from("projects")
      .update({
        title: projectName,
        description,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      project: {
        projectid: data.id,
        projectname: data.title,
        description: data.description,
      },
      message: "Project details updated",
    });
  } catch (err) {
    return NextResponse.json(
      { error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
