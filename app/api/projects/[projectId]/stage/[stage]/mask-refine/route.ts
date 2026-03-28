import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { processJob } from "@/lib/process-job";
import type { JobFeature } from "@/types";

const stageFeatureMap: Record<number, JobFeature> = {
  1: "model_generation",
  2: "environment_generation",
  3: "pose_generation",
  5: "final_composite",
};

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

  const { prompt, imagePaths, maskPath } = await request.json();

  if (!imagePaths?.length || !maskPath) {
    return NextResponse.json(
      { error: "imagePaths and maskPath are required" },
      { status: 400 }
    );
  }

  const feature = stageFeatureMap[stageNum];
  if (!feature) {
    return NextResponse.json(
      { error: `No generation feature mapped for stage ${stageNum}` },
      { status: 400 }
    );
  }

  const [originalImage, ...referenceImages] = imagePaths;
  const combinedPaths = [originalImage, maskPath, ...referenceImages];

  const refinementPrompt = `Refine the image using the provided mask. Areas marked white in the mask should be modified according to: ${prompt}. Preserve all unmasked areas exactly.`;

  try {
    const result = await processJob({
      userId: user.id,
      feature,
      imagePaths: combinedPaths,
      prompt: refinementPrompt,
      inputParams: { userPrompt: prompt, maskPath },
      projectId,
      stage: stageNum,
    });

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Processing failed";
    console.error("Mask refinement error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
