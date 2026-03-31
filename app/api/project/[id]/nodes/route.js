import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureProjectAccess } from "@/lib/projectAccess";

export const runtime = "nodejs";

export async function GET(req, { params: paramsPromise }) {
  try {
    const { id } = await paramsPromise;
    const supabase = await createClient(req);
    const admin = createAdminClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!id) {
      return NextResponse.json({ error: "Project id required" }, { status: 400 });
    }

    const access = await ensureProjectAccess({
      projectId: id,
      userId: user?.id || null,
      requireView: true,
    });

    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const { data, error } = await admin
      .from("nodes")
      .select("*")
      .eq("project_id", id)
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ nodes: data || [] });
  } catch (err) {
    return NextResponse.json(
      { error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(req, { params: paramsPromise }) {
  try {
    const { id } = await paramsPromise;
    const supabase = await createClient(req);
    const admin = createAdminClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const access = await ensureProjectAccess({
      projectId: id,
      userId: user.id,
      requireEdit: true,
    });

    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const body = await req.json();
    const { name, type, parent_id, content, language } = body;

    if (!id) {
      return NextResponse.json({ error: "Project id required" }, { status: 400 });
    }

    if (!name || !type) {
      return NextResponse.json(
        { error: "Missing required fields: name and type" },
        { status: 400 }
      );
    }

    if (!["file", "folder"].includes(type)) {
      return NextResponse.json(
        { error: "Type must be 'file' or 'folder'" },
        { status: 400 }
      );
    }

    const payload = {
      project_id: id,
      parent_id: parent_id || null,
      name,
      type,
      content: content || "",
      language: language || null,
    };

    let { data, error } = await admin
      .from("nodes")
      .insert(payload)
      .select()
      .single();

    // Backward compatibility for DBs where `nodes.language` is not created yet.
    if (error?.message?.includes("Could not find the 'language' column of 'nodes'")) {
      const { language: _ignoredLanguage, ...payloadWithoutLanguage } = payload;
      ({ data, error } = await admin
        .from("nodes")
        .insert(payloadWithoutLanguage)
        .select()
        .single());
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ node: data });
  } catch (err) {
    return NextResponse.json(
      { error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
