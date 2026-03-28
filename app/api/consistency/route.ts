import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { processJob } from "@/lib/process-job";
import { consistencyPrompt } from "@/lib/prompts";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { referenceImagePaths, sceneDescription, style } = await request.json();

  if (!referenceImagePaths?.length || !sceneDescription || !style) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const prompt = consistencyPrompt(sceneDescription, style);

  const result = await processJob({
    userId: user.id,
    feature: "consistency",
    imagePaths: referenceImagePaths,
    prompt,
    inputParams: { sceneDescription, style, referenceCount: referenceImagePaths.length },
  });

  return NextResponse.json(result);
}
