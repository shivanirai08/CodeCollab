import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const service = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(req, { params }) {
  try {
    const { nodeId } = params;

    if (!nodeId) {
      return NextResponse.json({ error: "Node id required" }, { status: 400 });
    }

    const { data, error } = await service
      .from("nodes")
      .select("*")
      .eq("id", nodeId)
      .single();

    if (error) {
      console.error("Get node error:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ node: data });
  } catch (err) {
    console.error("Get node error:", err);
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(req, { params }) {
  try {
    const { nodeId } = await params;
    const updates = await req.json();

    if (!nodeId) {
      return NextResponse.json({ error: "Node id required" }, { status: 400 });
    }

    console.log("Updating node:", nodeId, updates);

    const { data, error } = await service
      .from("nodes")
      .update(updates)
      .eq("id", nodeId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ node: data });
  } catch (err) {
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const { nodeId } = params;

    if (!nodeId) {
      return NextResponse.json({ error: "Node id required" }, { status: 400 });
    }

    const { error } = await service.from("nodes").delete().eq("id", nodeId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}