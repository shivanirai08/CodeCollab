import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function removeGitHubConnection() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { error } = await supabase
      .from("users")
      .update({ github_token: null })
      .eq("id", user.id);

    if (error) {
      return NextResponse.json(
        { error: "Failed to remove GitHub connection." },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: "GitHub connection removed." }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to remove GitHub connection." },
      { status: 500 }
    );
  }
}

export async function POST() {
  return removeGitHubConnection();
}

export async function DELETE() {
  return removeGitHubConnection();
}
