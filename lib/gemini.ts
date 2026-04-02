import "server-only";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { logAiCall } from "@/lib/ai-logger";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

function getModel(modelId?: string) {
  return genAI.getGenerativeModel({
    model: modelId ?? "gemini-3-pro-image-preview",
    generationConfig: {
      responseModalities: ["TEXT", "IMAGE"],
    } as Record<string, unknown>,
  });
}

export const geminiModel = getModel();

export async function generateWithImages(
  images: { mimeType: string; data: string }[],
  prompt: string,
  model?: string
) {
  const modelId = model ?? "gemini-3-pro-image-preview";
  const activeModel = model ? getModel(model) : geminiModel;
  const start = Date.now();

  const content = [
    ...images.map((img) => ({ inlineData: img })),
    prompt,
  ];

  try {
    const response = await activeModel.generateContent(content);
    const parts = response.response.candidates?.[0]?.content?.parts ?? [];
    const imagePart = parts.find(
      (p) => "inlineData" in p
    );

    const result =
      imagePart && "inlineData" in imagePart
        ? (imagePart.inlineData as { mimeType: string; data: string })
        : null;

    await logAiCall({
      timestamp: new Date().toISOString(),
      function: "generateWithImages",
      model: modelId,
      prompt,
      inputImagesRaw: images,
      outputRaw: result
        ? { type: "image", image: result }
        : { type: "null" },
      durationMs: Date.now() - start,
    });

    return result;
  } catch (err) {
    await logAiCall({
      timestamp: new Date().toISOString(),
      function: "generateWithImages",
      model: modelId,
      prompt,
      inputImagesRaw: images,
      outputRaw: {
        type: "error",
        error: err instanceof Error ? err.message : String(err),
      },
      durationMs: Date.now() - start,
    });
    throw err;
  }
}

export async function generateText(
  prompt: string,
  images?: { mimeType: string; data: string }[],
  model?: string
) {
  const modelId = model ?? "gemini-2.5-flash";
  const textModel = genAI.getGenerativeModel({
    model: modelId,
  });
  const start = Date.now();

  const content = [
    ...(images?.map((img) => ({ inlineData: img })) ?? []),
    prompt,
  ];

  try {
    const response = await textModel.generateContent(content);
    const text = response.response.text();

    await logAiCall({
      timestamp: new Date().toISOString(),
      function: "generateText",
      model: modelId,
      prompt,
      inputImagesRaw: images ?? [],
      outputRaw: { type: "text", text },
      durationMs: Date.now() - start,
    });

    return text;
  } catch (err) {
    await logAiCall({
      timestamp: new Date().toISOString(),
      function: "generateText",
      model: modelId,
      prompt,
      inputImagesRaw: images ?? [],
      outputRaw: {
        type: "error",
        error: err instanceof Error ? err.message : String(err),
      },
      durationMs: Date.now() - start,
    });
    throw err;
  }
}
