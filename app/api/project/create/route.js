import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req) {
  try {
    const supabase = createClient();
    const body = await req.json();
    const { projectName, description, visibility, template, language } = body;

    console.log("Incoming project data:", body);

    if (!projectName?.trim()) {
      return NextResponse.json({ error: "Project name is required" }, { status: 400 });
    }

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    console.log("Supabase user:", user);
    if (userError) console.error("Supabase user error:", userError);

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized - user not found" }, { status: 401 });
    }

    // Insert project
    const { data, error } = await supabase
      .from("projects")
      .insert([
        {
          title: projectName,
          description,
          visibility,
          template,
          language,
          owner_id: user.id,
        },
      ])
      .select()
      .single();

    console.log("Supabase insert response:", data);
    if (error) {
      console.error("Supabase insert error:", error);
      throw error;
    }

    return NextResponse.json({ message: "Project created", data }, { status: 201 });
  } catch (err) {
    console.error("Create project error (catch):", err);
    return NextResponse.json(
      { error: err.message || "Failed to create project" },
      { status: 500 }
    );
  }
}
