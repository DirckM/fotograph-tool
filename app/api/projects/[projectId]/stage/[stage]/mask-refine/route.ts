import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { processJob } from "@/lib/process-job";
import { completenessCheckPrompt } from "@/lib/prompts";
import { generateText } from "@/lib/gemini";
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

  const { prompt, imagePaths, maskPath, skipCompletenessCheck, enhancedPrompt } = await request.json();

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

  const activePrompt = enhancedPrompt || prompt;

  // Completeness check — cheap text call to surface unspecified details
  if (!skipCompletenessCheck) {
    try {
      const checkPrompt = completenessCheckPrompt(stageNum, activePrompt, true);
      const checkResult = await generateText(checkPrompt);
      const cleaned = checkResult.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleaned) as { complete: boolean; questions: string[] };

      if (!parsed.complete && parsed.questions?.length > 0) {
        return NextResponse.json({
          needsClarification: true,
          clarificationType: "completeness-check",
          questions: parsed.questions,
          originalPrompt: activePrompt,
          stage: stageNum,
          isMaskRefinement: true,
        });
      }
    } catch (err) {
      console.error("Completeness check failed, proceeding with refinement:", err);
    }
  }

  const [originalImage, ...referenceImages] = imagePaths;
  const combinedPaths = [originalImage, maskPath, ...referenceImages];

  const refinementPrompt = `You are an image editor. You will receive an original image, a black-and-white mask, and optionally reference images.

TASK: Edit ONLY the white-masked region of the original image according to the user's instruction below.

STRICT RULES:
- ONLY change what the user explicitly asks for. Nothing else.
- Do NOT alter the shape, size, position, or proportions of any facial feature unless the user specifically requests it.
- Do NOT change lighting, shadows, contrast, or color grading outside of what is explicitly requested.
- Preserve the exact geometry, structure, and proportions of the masked area unless a shape change is explicitly requested.
- All unmasked (black) areas must remain pixel-perfect unchanged.
- The edited region must blend seamlessly with the surrounding unmasked area.
- If reference images are provided, extract ONLY the specific traits mentioned in the user's instruction from them.

USER INSTRUCTION: ${activePrompt}

Apply ONLY what is described above. If the instruction says "change color" — change ONLY the color, not the shape. If it says "add freckles" — add ONLY freckles, change nothing else.`;

  try {
    const result = await processJob({
      userId: user.id,
      feature,
      imagePaths: combinedPaths,
      prompt: refinementPrompt,
      inputParams: { userPrompt: activePrompt, maskPath },
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
