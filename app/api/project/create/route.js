import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req) {
  try {
    const supabase = await createClient();
    const body = await req.json();
    const { projectName, description, visibility } = body;

    if (!projectName?.trim()) {
      return NextResponse.json(
        { error: "Project name is required" },
        { status: 400 }
      );
    }

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    console.log("User:", user);

    if (userError || !user) {
      console.error("User error:", userError);
      return NextResponse.json(
        { error: "Unauthorized - user not found" },
        { status: 401 }
      );
    }

    // Insert project
    const { data: projectData, error: projectError } = await supabase
      .from("projects")
      .insert([
        {
          title: projectName.trim(),
          description: description?.trim() || "",
          visibility: visibility || "private",
          owner_id: user.id,
        },
      ])
      .select()
      .single();

    if (projectError) {
      console.error("Project creation error:", projectError);
      return NextResponse.json(
        { error: projectError.message || "Failed to create project" },
        { status: 400 }
      );
    }

    console.log("Project created:", projectData);

    // Add the owner as a member with 'owner' role
    const { error: memberError } = await supabase
      .from("project_members")
      .insert([
        {
          project_id: projectData.id,
          user_id: user.id,
          role: "owner",
        },
      ]);

    if (memberError) {
      console.error("Member creation error:", memberError);
      // Don't fail the request, project is already created
    }

    return NextResponse.json(
      {
        message: "Project created successfully",
        project: projectData,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("Server error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to create project" },
      { status: 500 }
    );
  }
}
