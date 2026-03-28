import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { processJob } from "@/lib/process-job";
import {
  modelGenerationPrompt,
  environmentGenerationPrompt,
  poseGenerationPrompt,
  finalCompositePrompt,
} from "@/lib/prompts";
import type { JobFeature } from "@/types";

const stageFeatureMap: Record<number, JobFeature> = {
  1: "model_generation",
  2: "environment_generation",
  3: "pose_generation",
  5: "final_composite",
};

function buildPrompt(stageNum: number, prompt: string, hasImages: boolean): string {
  switch (stageNum) {
    case 1:
      return modelGenerationPrompt(prompt, hasImages);
    case 2:
      return environmentGenerationPrompt(prompt, hasImages);
    case 3:
      return poseGenerationPrompt(prompt, hasImages);
    case 5:
      return finalCompositePrompt(prompt);
    default:
      return prompt;
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string; stage: string }> }
) {
  const { projectId, stage } = await params;
  const stageNum = Number(stage);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { prompt, imagePaths, referenceNotes } = await request.json();

  const feature = stageFeatureMap[stageNum];
  if (!feature) {
    return NextResponse.json(
      { error: `No generation feature mapped for stage ${stageNum}` },
      { status: 400 }
    );
  }

  const generatedPrompt = buildPrompt(stageNum, prompt, Array.isArray(imagePaths) && imagePaths.length > 0);

  try {
    const result = await processJob({
      userId: user.id,
      feature,
      imagePaths: imagePaths ?? [],
      prompt: generatedPrompt,
      inputParams: {
        userPrompt: prompt,
        referenceNotes: referenceNotes || null,
      },
      projectId,
      stage: stageNum,
    });

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Processing failed";
    console.error("Stage generation error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
