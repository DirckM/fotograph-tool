import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ projectId: string; stage: string }> }
) {
  const { projectId, stage } = await params;
  const stageNum = Number(stage);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .single();

  if (projectError || !project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  if (project.current_stage !== stageNum) {
    return NextResponse.json(
      { error: "Cannot approve a stage that is not the current stage" },
      { status: 400 }
    );
  }

  const { error: stageError } = await supabase
    .from("project_stage_state")
    .upsert(
      {
        project_id: projectId,
        stage: stageNum,
        approved_at: new Date().toISOString(),
      },
      { onConflict: "project_id,stage" }
    );

  if (stageError) {
    return NextResponse.json({ error: stageError.message }, { status: 500 });
  }

  const nextStage = Math.min(project.current_stage + 1, 5);

  const { data: updatedProject, error: updateError } = await supabase
    .from("projects")
    .update({
      current_stage: nextStage,
      updated_at: new Date().toISOString(),
    })
    .eq("id", projectId)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json(updatedProject);
}
