import { NextResponse } from "next/server";
import { fetchGitHubRepositories } from "@/lib/github";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("users")
      .select("github_token")
      .eq("id", user.id)
      .single();

    if (error) {
      return NextResponse.json({ error: "Failed to load GitHub connection." }, { status: 500 });
    }

    if (!data?.github_token) {
      return NextResponse.json({ repositories: [], github_connected: false }, { status: 200 });
    }

    const repositories = await fetchGitHubRepositories(data.github_token);

    return NextResponse.json(
      { repositories, github_connected: true },
      {
        status: 200,
        headers: {
          "Cache-Control": "private, no-cache, no-store, must-revalidate",
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch GitHub repositories." },
      { status: 500 }
    );
  }
}
