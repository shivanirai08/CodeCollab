import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const service = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function PATCH(req, { params }) {
  try {
    const { nodeId } = params;
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
      console.error("Update node error:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.log("Node updated successfully:", data);
    return NextResponse.json({ node: data });
  } catch (err) {
    console.error("Update node error:", err);
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const { nodeId } = params;

    if (!nodeId) {
      return NextResponse.json({ error: "Node id required" }, { status: 400 });
    }

    console.log("Deleting node:", nodeId);

    // Delete node and its children 
    const { error } = await service.from("nodes").delete().eq("id", nodeId);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Delete node error:", err);
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}