import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { processJob } from "@/lib/process-job";
import { generatePerspectivePrompt } from "@/lib/prompts";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { imagePath, angle } = await request.json();

  if (!imagePath || !angle) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const prompt = generatePerspectivePrompt(angle);

  try {
    const result = await processJob({
      userId: user.id,
      feature: "generate_perspective",
      imagePaths: [imagePath],
      prompt,
      inputParams: { angle },
    });

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Processing failed";
    console.error("Generate perspective error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
