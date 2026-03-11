import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { processJob } from "@/lib/process-job";
import { upscalePrompt } from "@/lib/prompts";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { imagePath, resolution, detailPrompt } = await request.json();

  if (!imagePath || !resolution) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const prompt = upscalePrompt(resolution, detailPrompt);

  const result = await processJob({
    userId: user.id,
    feature: "upscale",
    imagePaths: [imagePath],
    prompt,
    inputParams: { resolution, detailPrompt },
  });

  return NextResponse.json(result);
}
