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

    // First check if project exists and get its visibility
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, visibility")
      .eq("id", id)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    // Get current user (optional - can be null for public projects)
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Check if user has permission to view members
    let canViewMembers = project.visibility === "public";

    if (!canViewMembers && user) {
      // Check if user is owner or collaborator
      const { data: membership } = await supabase
        .from("project_members")
        .select("role")
        .eq("project_id", id)
        .eq("user_id", user.id)
        .single();

      canViewMembers = !!membership;
    }

    if (!canViewMembers) {
      return NextResponse.json(
        { error: "You don't have permission to view members of this project" },
        { status: 403 }
      );
    }

    // Fetch all members for the project with user details
    const { data: members, error: membersError } = await supabase
      .from("project_members")
      .select(
        `
        role,
        user_id,
        joined_at,
        users (
          id,
          username,
          email,
          avatar_url
        )
      `
      )
      .eq("project_id", id)
      .order("joined_at", { ascending: true });

    if (membersError) {
      console.error("Members fetch error:", membersError);
      return NextResponse.json(
        { error: membersError.message },
        { status: 400 }
      );
    }

    // Structure members by role
    let owner = null;
    const collaborators = [];

    members?.forEach((member) => {
      if (!member.users) return; // Skip if user data is missing

      const userData = {
        user_id: member.user_id,
        username: member.users.username || "Unknown User",
        email: member.users.email || "",
        avatar_url: member.users.avatar_url || null,
        role: member.role,
        joined_at: member.joined_at,
      };

      if (member.role === "owner") {
        owner = userData;
      } else if (member.role === "collaborator") {
        collaborators.push(userData);
      }
    });

    return NextResponse.json({
      owner,
      collaborators,
      total: members?.length || 0,
    });
  } catch (err) {
    console.error("Error fetching members:", err);
    return NextResponse.json(
      { error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req, { params: paramsPromise }) {
  try {
    const { id } = await paramsPromise;
    const supabase = await createClient();
    const { searchParams } = new URL(req.url);
    const userIdToRemove = searchParams.get('userId');

    if (!id || !userIdToRemove) {
      return NextResponse.json(
        { error: "Project ID and User ID are required" },
        { status: 400 }
      );
    }

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "You must be logged in" },
        { status: 401 }
      );
    }

    // Check if current user is the owner
    const { data: currentUserRole } = await supabase
      .from("project_members")
      .select("role")
      .eq("project_id", id)
      .eq("user_id", user.id)
      .single();

    if (!currentUserRole || currentUserRole.role !== "owner") {
      return NextResponse.json(
        { error: "Only the project owner can remove collaborators" },
        { status: 403 }
      );
    }

    // Check if the user to remove is not the owner
    const { data: userToRemoveRole } = await supabase
      .from("project_members")
      .select("role")
      .eq("project_id", id)
      .eq("user_id", userIdToRemove)
      .single();

    if (userToRemoveRole?.role === "owner") {
      return NextResponse.json(
        { error: "Cannot remove the project owner" },
        { status: 400 }
      );
    }

    // Remove the collaborator
    const { error: deleteError } = await supabase
      .from("project_members")
      .delete()
      .eq("project_id", id)
      .eq("user_id", userIdToRemove);

    if (deleteError) {
      console.error("Delete member error:", deleteError);
      return NextResponse.json(
        { error: deleteError.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Collaborator removed successfully",
    });
  } catch (err) {
    console.error("Error removing collaborator:", err);
    return NextResponse.json(
      { error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}