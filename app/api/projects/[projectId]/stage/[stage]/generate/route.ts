import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { processJob, fetchImages } from "@/lib/process-job";
import {
  modelGenerationPrompt,
  environmentGenerationPrompt,
  poseGenerationPrompt,
  finalCompositePrompt,
  completenessCheckPrompt,
} from "@/lib/prompts";
import { generateText } from "@/lib/gemini";
import { refineReferenceNotes, checkReferenceConflicts } from "@/lib/reference-check";
import { createAdminClient } from "@/lib/supabase/admin";
import type { JobFeature } from "@/types";

const stageFeatureMap: Record<number, JobFeature> = {
  1: "model_generation",
  2: "environment_generation",
  3: "pose_generation",
  5: "final_composite",
};

function buildPrompt(stageNum: number, prompt: string, hasImages: boolean, referenceNotes?: string): string {
  switch (stageNum) {
    case 1:
      return modelGenerationPrompt(prompt, hasImages, referenceNotes);
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

  const { prompt, imagePaths, referenceNotes, imageNotes, confirmedNotes, skipWarnings, skipCompletenessCheck, enhancedPrompt } = await request.json();

  const feature = stageFeatureMap[stageNum];
  if (!feature) {
    return NextResponse.json(
      { error: `No generation feature mapped for stage ${stageNum}` },
      { status: 400 }
    );
  }

  // Step 1: If we have per-image notes and user hasn't confirmed yet, refine and return for review
  const hasImageNotes = Array.isArray(imageNotes) && imageNotes.some((n: { note: string }) => n.note);
  if (stageNum === 1 && hasImageNotes && !confirmedNotes) {
    try {
      const adminSupabase = createAdminClient();
      const noteUrls = imageNotes.map((n: { url: string }) => n.url);
      const noteTexts = imageNotes.map((n: { note: string }) => n.note);
      const images = await fetchImages(noteUrls, adminSupabase);
      const refined = await refineReferenceNotes(prompt, images, noteTexts);

      // Check for conflicts
      const refinedNotesText = refined
        .filter((r) => r.refined)
        .map((r) => `- ${r.refined}`)
        .join("\n");

      let warnings: string[] = [];
      if (!skipWarnings && refinedNotesText) {
        const check = await checkReferenceConflicts(prompt, refinedNotesText);
        if (check.hasConflict) warnings = check.warnings;
      }

      return NextResponse.json({
        needsConfirmation: true,
        refinedNotes: refined.map((r) => ({
          original: r.original,
          refined: r.refined,
          question: r.question ?? null,
          options: r.options ?? null,
        })),
        warnings,
      });
    } catch (err) {
      console.error("Note refinement failed, proceeding with originals:", err);
    }
  }

  // Step 2: Completeness check — cheap text call to surface unspecified details
  const activePrompt = enhancedPrompt || prompt;

  if (!skipCompletenessCheck) {
    try {
      const checkPrompt = completenessCheckPrompt(stageNum, activePrompt, false);
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
        });
      }
    } catch (err) {
      console.error("Completeness check failed, proceeding with generation:", err);
    }
  }

  // Step 3: Build prompt with confirmed (possibly user-edited) refined notes, or fall back to originals
  const finalNotes = confirmedNotes
    ? (confirmedNotes as string[]).filter(Boolean).map((n: string) => `- ${n}`).join("\n")
    : referenceNotes || "";

  const generatedPrompt = buildPrompt(stageNum, activePrompt, Array.isArray(imagePaths) && imagePaths.length > 0, finalNotes);

  try {
    const result = await processJob({
      userId: user.id,
      feature,
      imagePaths: imagePaths ?? [],
      prompt: generatedPrompt,
      inputParams: {
        userPrompt: activePrompt,
        referenceNotes: referenceNotes || null,
        refinedNotes: finalNotes || null,
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
