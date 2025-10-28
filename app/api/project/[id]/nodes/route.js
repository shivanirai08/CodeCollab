import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = 'nodejs';

const service = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(req, { params }) {
  try {
    const { id } = params;
    
    if (!id) {
      return NextResponse.json({ error: "Project id required" }, { status: 400 });
    }

    const { data, error } = await service
      .from("nodes")
      .select("*")
      .eq("project_id", id)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Fetch nodes error:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ nodes: data || [] });
  } catch (err) {
    console.error("Fetch nodes error:", err);
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req, { params }) {
  try {
    const { id } = params;
    const body = await req.json();
    const { name, type, parent_id, content, language } = body;

    console.log("Creating node:", { id, name, type, parent_id });

    if (!id) {
      return NextResponse.json({ error: "Project id required" }, { status: 400 });
    }

    if (!name || !type) {
      return NextResponse.json({ error: "Missing required fields: name and type" }, { status: 400 });
    }

    if (!["file", "folder"].includes(type)) {
      return NextResponse.json({ error: "Type must be 'file' or 'folder'" }, { status: 400 });
    }

    const { data, error } = await service
      .from("nodes")
      .insert({
        project_id: id,
        parent_id: parent_id || null,
        name,
        type,
        content: content || "",
        language: language || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Create node error:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.log("Node created successfully:", data);
    return NextResponse.json({ node: data });
  } catch (err) {
    console.error("Create node error:", err);
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}