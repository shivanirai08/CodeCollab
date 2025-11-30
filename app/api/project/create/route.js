import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, getClientIp } from "@/lib/rateLimit";

// Rate limiter: 10 project creations per hour per IP
const limiter = rateLimit({
  interval: 60 * 60 * 1000, // 1 hour
  uniqueTokenPerInterval: 100
});

export async function POST(req) {
  //Apply rate limiting to prevent spam project creation
  const ip = getClientIp(req);
  try {
    await limiter.check(10, ip);
  } catch (error) {
    return NextResponse.json(
      { error: 'Too many projects created. Please try again later.', retryAfter: error.retryAfter },
      {
        status: 429,
        headers: {
          'Retry-After': error.retryAfter?.toString() || '3600',
          'X-RateLimit-Limit': '10',
          'X-RateLimit-Remaining': '0'
        }
      }
    );
  }

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

    if (userError || !user) {
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
      return NextResponse.json(
        { error: projectError.message || "Failed to create project" },
        { status: 400 }
      );
    }

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
    return NextResponse.json(
      { error: err.message || "Failed to create project" },
      { status: 500 }
    );
  }
}
