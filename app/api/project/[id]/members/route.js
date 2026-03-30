import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureProjectAccess, normalizeMemberRole } from "@/lib/projectAccess";

export async function GET(req, { params: paramsPromise }) {
  try {
    const { id } = await paramsPromise;
    const supabase = await createClient(req);
    const admin = createAdminClient();

    if (!id) {
      return NextResponse.json(
        { error: "Project ID is required" },
        { status: 400 }
      );
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const access = await ensureProjectAccess({
      projectId: id,
      userId: user?.id || null,
      requireView: true,
    });

    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const { data: members, error: membersError } = await admin
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

    let owner = null;
    const membersList = [];

    members?.forEach((member) => {
      if (!member.users) return;

      const normalizedRole = normalizeMemberRole(member.role);
      const userData = {
        user_id: member.user_id,
        username: member.users.username || "Unknown User",
        email: member.users.email || "",
        avatar_url: member.users.avatar_url || null,
        role: normalizedRole,
        joined_at: member.joined_at,
      };

      if (normalizedRole === "owner") {
        owner = userData;
      } else {
        membersList.push(userData);
      }
    });

    return NextResponse.json({
      owner,
      members: membersList,
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
    const supabase = await createClient(req);
    const admin = createAdminClient();
    const { searchParams } = new URL(req.url);
    const userIdToRemove = searchParams.get("userId");

    if (!id || !userIdToRemove) {
      return NextResponse.json(
        { error: "Project ID and User ID are required" },
        { status: 400 }
      );
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "You must be logged in" },
        { status: 401 }
      );
    }

    const access = await ensureProjectAccess({
      projectId: id,
      userId: user.id,
      requireView: true,
    });

    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    if (!access.context.permissions.isOwner) {
      return NextResponse.json(
        { error: "Only the project owner can remove members" },
        { status: 403 }
      );
    }

    const { data: userToRemoveRole } = await admin
      .from("project_members")
      .select("role")
      .eq("project_id", id)
      .eq("user_id", userIdToRemove)
      .maybeSingle();

    if (normalizeMemberRole(userToRemoveRole?.role) === "owner") {
      return NextResponse.json(
        { error: "Cannot remove the project owner" },
        { status: 400 }
      );
    }

    const { error: deleteError } = await admin
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
      message: "Member removed successfully",
    });
  } catch (err) {
    console.error("Error removing member:", err);
    return NextResponse.json(
      { error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
