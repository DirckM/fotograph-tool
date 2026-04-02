import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Creates a test project pre-loaded with moodboard images and description,
 * ready to test generation flows without manual setup.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const {
    name = "Test Scenario",
    description = "Young man, early 20s, light skin with prominent freckles, short cropped red-blonde hair, sharp blue eyes, strong jawline, athletic build.",
    moodboardUrls = [],
  } = body;

  // Create the project at stage 1 (context pre-approved)
  const { data: project, error } = await supabase
    .from("projects")
    .insert({
      user_id: user.id,
      name,
      description,
      current_stage: 1,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Mark context stage as approved
  await supabase.from("project_stage_state").insert({
    project_id: project.id,
    stage: 0,
    state: {},
    approved_at: new Date().toISOString(),
  });

  // Add moodboard images as assets
  const assets: Record<string, unknown>[] = [];
  for (const url of moodboardUrls) {
    const { data: asset } = await supabase
      .from("project_assets")
      .insert({
        project_id: project.id,
        user_id: user.id,
        stage: 1,
        asset_type: "face_moodboard",
        source: "upload",
        storage_path: url,
        metadata: {},
        sort_order: assets.length,
      })
      .select()
      .single();

    if (asset) assets.push(asset);
  }

  return NextResponse.json({
    project,
    assets,
    url: `/dashboard/projects/${project.id}/model`,
  });
}
