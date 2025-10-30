import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req, { params }) {
  try {
    const { id } = params;
    const supabase = await createClient();

    // Fetch all members for the project
    const { data, error } = await supabase
      .from('project_members')
      .select(`
        role,
        user_id,
        users (
          username,
          email,
          avatar_url
        )
      `)
      .eq("project_id", id);

      console.log(data);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    // Structure members by role
    let owner = null;
    const collaborators = [];

    data?.forEach((member) => {
      const user = {
        username: member.users?.username,
        email: member.users?.email,
        avatar_url: member.users?.avatar_url,
        user_id: member.user_id,
        role: member.role,
      };
      if (member.role === "owner") owner = user;
      else if (member.role === "collaborator") collaborators.push(user);
    });

    console.log(owner, collaborators);
    return NextResponse.json({ owner, collaborators});
  } catch (err) {
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}