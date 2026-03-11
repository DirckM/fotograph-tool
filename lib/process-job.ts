import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateWithImages } from "@/lib/gemini";
import type { JobFeature } from "@/types";

interface ProcessJobParams {
  userId: string;
  feature: JobFeature;
  imagePaths: string[];
  prompt: string;
  inputParams?: Record<string, unknown>;
}

export async function processJob({
  userId,
  feature,
  imagePaths,
  prompt,
  inputParams = {},
}: ProcessJobParams) {
  const supabase = createAdminClient();

  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .insert({
      user_id: userId,
      feature,
      status: "processing",
      input_images: imagePaths,
      input_params: inputParams,
    })
    .select()
    .single();

  if (jobError || !job) {
    console.error("Job creation failed:", jobError?.message, jobError?.code);
    throw new Error(`Failed to create job: ${jobError?.message ?? "unknown"}`);
  }

  try {
    const images = await Promise.all(
      imagePaths.map(async (path) => {
        let buffer: Buffer;
        let mimeType: string;

        if (path.startsWith("https://") || path.startsWith("http://")) {
          const res = await fetch(path);
          if (!res.ok) throw new Error(`Failed to fetch image: ${path}`);
          buffer = Buffer.from(await res.arrayBuffer());
          mimeType = res.headers.get("content-type") || "image/png";
        } else {
          const { data, error } = await supabase.storage
            .from("uploads")
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

    const result = await generateWithImages(images, prompt);

    if (!result) {
      throw new Error("No image generated");
    }

    const resultBuffer = Buffer.from(result.data, "base64");
    const resultPath = `${userId}/${job.id}.png`;

    const { error: uploadError } = await supabase.storage
      .from("results")
      .upload(resultPath, resultBuffer, {
        contentType: "image/png",
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
