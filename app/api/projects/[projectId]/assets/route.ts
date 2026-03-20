import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const stage = url.searchParams.get("stage");

  let query = supabase
    .from("project_assets")
    .select("*")
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (stage !== null) {
    query = query.eq("stage", Number(stage));
  }

  const { data: assets, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(assets);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { stage, asset_type, role, storage_path, external_url, source, metadata, sort_order } = body;

  if (stage === undefined || !asset_type || !source) {
    return NextResponse.json(
      { error: "stage, asset_type, and source are required" },
      { status: 400 }
    );
  }

  const { data: asset, error } = await supabase
    .from("project_assets")
    .insert({
      project_id: projectId,
      user_id: user.id,
      stage,
      asset_type,
      role,
      storage_path,
      external_url,
      source,
      metadata,
      sort_order,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(asset);
}
