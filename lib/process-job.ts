import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateWithImages } from "@/lib/gemini";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { JobFeature } from "@/types";

export async function fetchImages(
  paths: string[],
  supabase: SupabaseClient
): Promise<{ mimeType: string; data: string }[]> {
  return Promise.all(
    paths.map(async (path) => {
      let buffer: Buffer;
      let mimeType: string;

      if (path.startsWith("data:")) {
        const match = path.match(/^data:([^;]+);base64,(.+)$/);
        if (!match) throw new Error("Invalid data URL");
        mimeType = match[1];
        buffer = Buffer.from(match[2], "base64");
      } else if (path.startsWith("https://") || path.startsWith("http://")) {
        const res = await fetch(path);
        if (!res.ok) throw new Error(`Failed to fetch image: ${path}`);
        buffer = Buffer.from(await res.arrayBuffer());
        mimeType = res.headers.get("content-type") || "image/png";
      } else {
        const { data, error } = await supabase.storage
          .from("project-assets")
          .download(path);

        if (error || !data) {
          throw new Error(`Failed to download image: ${path}`);
        }

        buffer = Buffer.from(await data.arrayBuffer());
        mimeType = data.type || "image/png";
      }

      return {
        mimeType,
        data: buffer.toString("base64"),
      };
    })
  );
}

interface ProcessJobParams {
  userId: string;
  feature: JobFeature;
  imagePaths: string[];
  prompt: string;
  inputParams?: Record<string, unknown>;
  projectId?: string;
  stage?: number;
  model?: string;
}

export async function processJob({
  userId,
  feature,
  imagePaths,
  prompt,
  inputParams = {},
  projectId,
  stage,
  model,
}: ProcessJobParams) {
  const supabase = createAdminClient();

  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .insert({
      user_id: userId,
      feature,
      status: "processing",
      input_images: imagePaths,
      input_params: { ...inputParams, generatedPrompt: prompt },
      project_id: projectId ?? null,
      stage: stage ?? null,
    })
    .select()
    .single();

  if (jobError || !job) {
    console.error("Job creation failed:", jobError?.message, jobError?.code);
    throw new Error(`Failed to create job: ${jobError?.message ?? "unknown"}`);
  }

  try {
    const images = await fetchImages(imagePaths, supabase);

    const result = await generateWithImages(images, prompt, model);

    if (!result) {
      throw new Error("No image generated");
    }

    const resultBuffer = Buffer.from(result.data, "base64");
    const ext = result.mimeType === "image/jpeg" ? "jpg" : "png";
    const resultPath = `${userId}/${job.id}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("results")
      .upload(resultPath, resultBuffer, {
        contentType: result.mimeType || "image/png",
        upsert: false,
      });

    if (uploadError) {
      throw new Error("Failed to upload result");
    }

    const { data: { publicUrl } } = supabase.storage
      .from("results")
      .getPublicUrl(resultPath);

    await supabase
      .from("jobs")
      .update({
        status: "completed",
        result_image: publicUrl,
        completed_at: new Date().toISOString(),
      })
      .eq("id", job.id);

    return { ...job, status: "completed", result_image: publicUrl };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Processing failed";

    await supabase
      .from("jobs")
      .update({
        status: "failed",
        error_message: message,
        completed_at: new Date().toISOString(),
      })
      .eq("id", job.id);

    return { ...job, status: "failed", error_message: message };
  }
}
