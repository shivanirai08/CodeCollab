import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req, { params: paramsPromise }) {
  try {
    const { id } = await paramsPromise;
    const supabase = createClient();

    if (!id) {
      return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("projects")
      .select("id, title, description, visibility, join_code, template, language")
      .eq("id", id)
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    const project = {
      projectid: data.id,
      projectname: data.title,
      description: data.description,
      visibility: data.visibility,
      join_code: data.join_code,
      template: data.template,
      language: data.language,
    };

    return NextResponse.json({ project });
  } catch (err) {
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
