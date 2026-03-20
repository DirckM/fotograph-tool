export function upscalePrompt(
  resolution: "2x" | "4x",
  detailPrompt?: string
): string {
  const base = `Upscale this image to ${resolution} resolution. Enhance fine details like skin texture, fabric weave, hair strands, and material grain while preserving the original composition, colors, and lighting exactly.`;
  if (detailPrompt) {
    return `${base} Additionally: ${detailPrompt}`;
  }
  return base;
}

export function faceSwapPrompt(
  sourceCount: number,
  options?: {
    lookDirection?: string;
    clothingTexture?: string;
  }
): string {
  const lookDirectionInstruction = options?.lookDirection && options.lookDirection !== "same"
    ? `- Adjust the gaze direction so the person is looking ${options.lookDirection}`
    : "- Preserve the original expression direction and head pose";

  const clothingInstruction = options?.clothingTexture
    ? `- Enhance the clothing to show more ${options.clothingTexture} texture and detail`
    : "- Do not alter the clothing";

  return `Replace the face in Image 1 (the target photo) with the face identity shown in the reference images (Images 2${sourceCount > 1 ? `-${sourceCount + 1}` : ""}).

Requirements:
- Match the lighting, angle, and shadows of the original face position
- Blend skin tones naturally with the target image
${lookDirectionInstruction}
- The result must look photorealistic and natural
- Do not alter anything else in the image besides the face and the items specifically mentioned below
${clothingInstruction}`;
}

export function tryOnPrompt(clothingType: string, context?: string): string {
  let prompt = `Image 1 shows a ${clothingType} garment. Image 2 shows a person.

Dress the person in Image 2 with the ${clothingType} from Image 1.

Requirements:
- The clothing must drape naturally on the person's body
- Match the person's pose, proportions, and body shape
- Preserve the person's face, facial features, and facial structure pixel-perfectly — do not alter face shape, skin tone, expression, or any facial detail whatsoever
- Preserve the person's exact body size, height, and proportions — the person must appear at the exact same scale and size as in the original image
- Preserve the person's hair, skin, and background exactly
- Maintain realistic fabric physics, wrinkles, and folds
- Only change the ${clothingType} - keep everything else identical
- The result must look like the same person in the same photo with only the clothing swapped
- Maintain the exact same image aspect ratio and canvas dimensions as the original
- Keep every element at the exact same scale — nothing should appear larger or smaller
- If there is any text in the image, it must remain in the exact same position, size, and style`;

  if (context) {
    prompt += `\n\nAdditional context about the photo: ${context}`;
  }

  return prompt;
}

export function generatePerspectivePrompt(angle: string): string {
  return `Generate a photorealistic ${angle} view of the same person's face shown in this image.

Requirements:
- Maintain exact facial features, skin tone, hair color and style, and all distinguishing characteristics
- The person must be immediately recognizable as the same individual
- Natural lighting consistent with the original photo
- Clean, neutral background
- Only change the camera angle to ${angle} — keep everything about the person identical`;
}

export function adjustPrompt(userPrompt: string): string {
  return `Apply the following adjustment to this image: ${userPrompt}

Requirements:
- Only make the specific change described — do not alter anything else
- Preserve the exact image dimensions, aspect ratio, and scale
- Keep all colors, lighting, and composition identical except where the adjustment requires a change
- The result must look photorealistic and seamless`;
}

export function consistencyPrompt(
  sceneDescription: string,
  style: string
): string {
  return `Generate a new ${style} image of the character shown in the reference images.

New scene: ${sceneDescription}

Requirements:
- Maintain exact facial features, bone structure, and distinguishing characteristics
- Preserve hair color, style, and length
- Keep body proportions consistent with the references
- The character must be immediately recognizable as the same person
- Apply the described scene naturally while keeping character identity intact`;
}

export function modelGenerationPrompt(
  description: string,
  hasMoodboard: boolean
): string {
  const moodboardInstruction = hasMoodboard
    ? "Use the provided reference/moodboard images as visual inspiration for the model's appearance. Synthesize the best qualities from the references into a single coherent identity."
    : "";

  return `Generate a photorealistic portrait of a fashion model with the following description:

${description}

${moodboardInstruction}

Requirements:
- The result must be a single, consistent human identity
- Photorealistic quality suitable for professional fashion photography
- Clean, well-lit studio portrait style
- Sharp facial features with natural skin texture
- Neutral expression suitable for fashion work
- The model should appear natural and believable, not AI-generated`;
}

export function environmentGenerationPrompt(
  description: string,
  hasMoodboard: boolean
): string {
  const moodboardInstruction = hasMoodboard
    ? "Use the provided reference images as visual inspiration. Combine the best elements from the references into a single coherent environment."
    : "";

  return `Generate a photorealistic environment/setting for a professional photoshoot:

${description}

${moodboardInstruction}

Requirements:
- Photorealistic quality with natural lighting
- High resolution with fine detail in textures and materials
- Suitable as a photography backdrop
- Coherent perspective and depth
- Natural shadows and ambient occlusion`;
}

export function poseGenerationPrompt(
  description: string,
  hasMoodboard: boolean
): string {
  const moodboardInstruction = hasMoodboard
    ? "Use the provided reference images as visual inspiration for the pose."
    : "";

  return `Generate a black and white silhouette/pose reference showing:

${description}

${moodboardInstruction}

Requirements:
- Clean black silhouette on white background
- Clear body pose with visible limbs and joints
- Natural, anatomically correct pose
- Fashion/editorial style posing
- Full body visible from head to toe`;
}

export function finalCompositePrompt(
  projectDescription: string
): string {
  return `Create a photorealistic composite fashion photograph using all the provided reference images.

The images provided are (in order):
1. Model face reference(s)
2. Environment/setting
3. Pose reference (silhouette)
4. Garment/clothing reference(s)

Project context: ${projectDescription}

Requirements:
- Place the model in the environment following the pose reference
- Dress the model in the provided garment(s)
- Match lighting between the model and environment naturally
- Cast realistic shadows
- Maintain the model's exact facial identity from the references
- The garment should drape naturally on the posed body
- The final result must look like a real professional photograph
- Perspective alignment between all elements must be seamless`;
}

export function searchQuerySuggestionPrompt(
  projectDescription: string
): string {
  return `Based on the following project description for a fashion photoshoot, suggest 2-3 short Pinterest search queries that would help find relevant visual references (moodboard images).

Project description:
${projectDescription}

Return only the search queries, one per line. Keep each query under 5 words. Focus on the most distinctive visual elements described.`;
}
