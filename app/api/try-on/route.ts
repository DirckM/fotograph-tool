import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { processJob } from "@/lib/process-job";
import { tryOnPrompt } from "@/lib/prompts";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { clothingImagePath, personImagePath, clothingType, context } = await request.json();

  if (!clothingImagePath || !personImagePath || !clothingType) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const prompt = tryOnPrompt(clothingType, context);

  try {
    const result = await processJob({
      userId: user.id,
      feature: "try_on",
      imagePaths: [clothingImagePath, personImagePath],
      prompt,
      inputParams: { clothingType },
    });

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Processing failed";
    console.error("Try-on error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
