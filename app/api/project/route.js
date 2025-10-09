import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = createClient();

    // Get the current logged-in user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = user.id;

    // Fetch all projects where the user is a member
    const { data: memberships, error: membershipsError } = await supabase
      .from("project_members")
      .select(`
        project_id,
        role,
        projects (
          id,
          title,
          thumbnail,
          updated_at
        )
      `)
      .eq("user_id", userId);

    if (membershipsError) throw membershipsError;

    if (!memberships?.length) {
      return NextResponse.json({ projects: [] });
    }

    // Extract project IDs
    const projectIds = memberships.map((m) => m.project_id);

    // Fetch all members for these projects
    const { data: membersData, error: membersError } = await supabase
      .from("project_members")
      .select(`
        project_id,
        role,
        users (
          id,
          username
        )
      `)
      .in("project_id", projectIds);

    if (membersError) throw membersError;

    // Organize members by project
    const membersByProject = membersData.reduce((acc, m) => {
      if (!acc[m.project_id]) acc[m.project_id] = [];
      if (m.users) {
        const initials =
          m.users.username
            ?.split(" ")
            .map((word) => word[0])
            .join("")
            .toUpperCase() || "?";
        acc[m.project_id].push({
          id: m.users.id,
          username: m.users.username,
          initials,
          role: m.role,
        });
      }
      return acc;
    }, {});

    // Prepare final response
    const projects = memberships.map((m) => {
      const p = m.projects;
      return {
        id: p.id,
        title: p.title,
        thumbnail: p.thumbnail || null,
        lastEditedText: p.updated_at
          ? `Last edited ${new Date(p.updated_at).toLocaleDateString()}`
          : null,
        participants: membersByProject[p.id] || [],
        role: m.role,
      };
    });

    return NextResponse.json({ projects });
  } catch (err) {
    console.error("Error fetching projects:", err);
    return NextResponse.json(
      { error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}