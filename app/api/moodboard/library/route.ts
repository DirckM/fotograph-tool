import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const MOODBOARD_ASSET_TYPES = [
  "face_moodboard",
  "model_moodboard",
  "env_moodboard",
  "pose_moodboard",
  "garment_image",
];

const CATEGORY_TO_ASSET_TYPE: Record<string, string> = {
  model: "face_moodboard",
  env: "env_moodboard",
  pose: "pose_moodboard",
  garment: "garment_image",
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { asset_type, storage_path } = body;

  if (!asset_type || !storage_path) {
    return NextResponse.json(
      { error: "asset_type and storage_path are required" },
      { status: 400 }
    );
  }

  if (!MOODBOARD_ASSET_TYPES.includes(asset_type)) {
    return NextResponse.json(
      { error: "Invalid asset_type" },
      { status: 400 }
    );
  }

  const { data: asset, error } = await supabase
    .from("project_assets")
    .insert({
      user_id: user.id,
      project_id: null,
      stage: 0,
      asset_type,
      source: "upload",
      storage_path,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(asset, { status: 201 });
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category") ?? "all";

  let query = supabase
    .from("project_assets")
    .select("id, asset_type, storage_path, external_url, source, created_at, project_id, projects(name)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (category !== "all" && CATEGORY_TO_ASSET_TYPE[category]) {
    query = query.eq("asset_type", CATEGORY_TO_ASSET_TYPE[category]);
  } else {
    query = query.in("asset_type", MOODBOARD_ASSET_TYPES);
  }

  const { data: assets, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const result = (assets ?? []).map((asset: Record<string, unknown>) => {
    const project = asset.projects as { name: string } | null;
    return {
      id: asset.id,
      asset_type: asset.asset_type,
      storage_path: asset.storage_path,
      external_url: asset.external_url,
      source: asset.source,
      created_at: asset.created_at,
      project_id: asset.project_id,
      project_name: project?.name ?? null,
    };
  });

  return NextResponse.json({ assets: result });
}
