import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string; stage: string }> }
) {
  const { projectId, stage } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .single();

  if (projectError || !project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const { data: stageState, error } = await supabase
    .from("project_stage_state")
    .select("*")
    .eq("project_id", projectId)
    .eq("stage", Number(stage))
    .single();

  if (error || !stageState) {
    return NextResponse.json({ state: {}, approved_at: null });
  }

  return NextResponse.json(stageState);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ projectId: string; stage: string }> }
) {
  const { projectId, stage } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { state } = await request.json();

  const { data: stageState, error } = await supabase
    .from("project_stage_state")
    .upsert(
      {
        project_id: projectId,
        stage: Number(stage),
        state,
      },
      { onConflict: "project_id,stage" }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(stageState);
}
