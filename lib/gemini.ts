import "server-only";
import { GoogleGenerativeAI } from "@google/generative-ai";

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
  const activeModel = model ? getModel(model) : geminiModel;

  const content = [
    ...images.map((img) => ({ inlineData: img })),
    prompt,
  ];

  const response = await activeModel.generateContent(content);
  const parts = response.response.candidates?.[0]?.content?.parts ?? [];
  const imagePart = parts.find(
    (p) => "inlineData" in p
  );

  if (!imagePart || !("inlineData" in imagePart)) {
    return null;
  }

  return imagePart.inlineData as { mimeType: string; data: string };
}

export async function generateText(
  prompt: string,
  images?: { mimeType: string; data: string }[],
  model?: string
) {
  const textModel = genAI.getGenerativeModel({
    model: model ?? "gemini-2.0-flash",
  });

  const content = [
    ...(images?.map((img) => ({ inlineData: img })) ?? []),
    prompt,
  ];

  const response = await textModel.generateContent(content);
  return response.response.text();
}
