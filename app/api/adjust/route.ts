import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { processJob } from "@/lib/process-job";
import { adjustPrompt } from "@/lib/prompts";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { imagePath, userPrompt } = await request.json();

  if (!imagePath || !userPrompt) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const prompt = adjustPrompt(userPrompt);

  try {
    const result = await processJob({
      userId: user.id,
      feature: "adjust",
      imagePaths: [imagePath],
      prompt,
      inputParams: { userPrompt },
    });

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Processing failed";
    console.error("Adjust error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
