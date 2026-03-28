import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { processJob } from "@/lib/process-job";
import { faceSwapPrompt } from "@/lib/prompts";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { targetImagePath, sourceImagePaths, lookDirection, clothingTexture } = await request.json();

  if (!targetImagePath || !sourceImagePaths?.length) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const prompt = faceSwapPrompt(sourceImagePaths.length, {
    lookDirection: lookDirection || undefined,
    clothingTexture: clothingTexture || undefined,
  });

  try {
    const result = await processJob({
      userId: user.id,
      feature: "face_swap",
      imagePaths: [targetImagePath, ...sourceImagePaths],
      prompt,
      inputParams: { lookDirection, clothingTexture, sourceCount: sourceImagePaths.length },
    });

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Processing failed";
    console.error("Face swap error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
