import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(req, { params: paramsPromise }) {
  try {
    const { id } = await paramsPromise;
    const supabase = await createClient();
    const { visibility } = await req.json();

    if (!id) {
      return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
    }

    if (!visibility || !["public", "private"].includes(visibility)) {
      return NextResponse.json(
        { error: "Invalid visibility value. Must be 'public' or 'private'" },
        { status: 400 }
      );
    }

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is the owner
    const { data: project } = await supabase
      .from("projects")
      .select("owner_id")
      .eq("id", id)
      .single();

    if (!project || project.owner_id !== user.id) {
      return NextResponse.json(
        { error: "Only the project owner can change visibility" },
        { status: 403 }
      );
    }

    // Update visibility
    const { data, error } = await supabase
      .from("projects")
      .update({ visibility, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ 
      project: data,
      message: `Project visibility updated to ${visibility}` 
    });
  } catch (err) {
    return NextResponse.json(
      { error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}