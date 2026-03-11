import "server-only";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export const geminiModel = genAI.getGenerativeModel({
  model: "gemini-3-pro-image-preview",
  generationConfig: {
    responseModalities: ["TEXT", "IMAGE"],
  } as Record<string, unknown>,
});

export async function generateWithImages(
  images: { mimeType: string; data: string }[],
  prompt: string
) {
  const content = [
    ...images.map((img) => ({ inlineData: img })),
    prompt,
  ];

  const response = await geminiModel.generateContent(content);
  const parts = response.response.candidates?.[0]?.content?.parts ?? [];
  const imagePart = parts.find(
    (p) => "inlineData" in p
  );

  if (!imagePart || !("inlineData" in imagePart)) {
    return null;
  }

  return imagePart.inlineData as { mimeType: string; data: string };
}
