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
  hasMoodboard: boolean,
  referenceNotes?: string
): string {
  let moodboardInstruction = "";

  if (hasMoodboard) {
    moodboardInstruction = referenceNotes
      ? `Reference images are provided. DO NOT copy any reference face as-is. Instead, only extract the specific traits noted below and apply them to a NEW face matching the description above.

Per-reference notes (each note describes what to extract from the corresponding image):
${referenceNotes}

IMPORTANT: The description above defines the identity (gender, age, ethnicity, hair, eyes, etc). The reference images are ONLY for borrowing specific visual traits mentioned in the notes — ignore everything else about the reference faces.`
      : `Reference images are provided as general visual inspiration for qualities like skin texture, lighting style, and facial proportions. DO NOT copy any reference face — generate a NEW face that matches the description above.`;
  }

  return `Generate a photorealistic portrait of a fashion model with the following description:

${description}

${moodboardInstruction}

Requirements:
- The result must be a single, consistent human identity
- The description above is the source of truth for the model's identity
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

  return `Generate a neutral gray-toned mannequin figure showing the following pose:

${description}

${moodboardInstruction}

Requirements:
- Featureless mannequin figure with smooth gray skin and visible form/shading
- No facial features, hair, or clothing — just a neutral humanoid form
- Clean white background
- Visible depth and volume through light and shadow on the body
- Clear body pose with distinct limb positions and joint angles
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
3. Pose reference (mannequin figure showing body position and depth)
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

const stageNames: Record<number, string> = {
  1: "model (face/portrait)",
  2: "environment (background/setting)",
  3: "pose (body posture/mannequin)",
  5: "final composite (all elements combined)",
};

const stageConcerns: Record<number, string> = {
  1: `- Facial features: eye shape, eye color, gaze direction, eyebrow thickness/arch
- Skin: texture, freckles, moles, pores, complexion
- Hair: exact color tone, length, parting, texture (curly/wavy/straight), volume
- Expression: mouth position (slightly open, closed, smiling), teeth visibility
- Face shape: jawline, cheekbone prominence, chin shape
- Lighting on face: catch light position, shadow side, highlight placement`,
  2: `- Lighting: direction (front/side/back), color temperature (warm/cool), intensity, hard vs soft shadows
- Time of day: specific hour affects sun angle and color
- Depth of field: sharp background or blurred
- Surface materials: exact textures (polished marble vs rough stone, glossy vs matte)
- Atmosphere: haze, fog, dust particles, clean air
- Color palette: dominant and accent colors
- Scale: how large the space feels relative to a person`,
  3: `- Hand positioning: fingers spread/together/curled, palm direction, grip
- Weight distribution: which leg bears weight, hip tilt
- Spine curvature: straight/slouched/arched
- Head tilt and rotation: degrees of turn, chin up/down
- Arm angles: bent/straight, distance from body
- Shoulder alignment: level/dropped/raised
- Foot placement: together/apart, angle, pointing direction`,
  5: `- Color grading consistency between model and environment
- Shadow direction matching between all elements
- Scale/proportion of model relative to environment
- Perspective alignment between pose and camera angle
- Garment fit and drape on the posed body
- Edge blending between composited elements
- Overall lighting coherence across all layers`,
};

export function completenessCheckPrompt(
  stageNum: number,
  userPrompt: string,
  isMaskRefinement: boolean,
  imageDescriptions?: string[]
): string {
  const stageName = stageNames[stageNum] ?? "unknown";
  const concerns = stageConcerns[stageNum] ?? "";

  const imageContext = imageDescriptions?.length
    ? `\nReference images provided:\n${imageDescriptions.map((d, i) => `- Image ${i + 1}: ${d}`).join("\n")}`
    : "";

  if (isMaskRefinement) {
    return `You are analyzing a mask refinement instruction for a ${stageName} image.

The user has painted a mask on a specific region and wants to change it. Their instruction:
"${userPrompt}"
${imageContext}

Your job: identify details the user has NOT specified that could lead to undesirable results. Image generation models commonly produce artifacts when details are left ambiguous.

Stage-specific concerns for ${stageName}:
${concerns}

Respond with valid JSON only, no markdown:
{
  "complete": true/false,
  "questions": ["question 1", "question 2", ...]
}

Rules:
- Only flag genuinely ambiguous details that could produce visibly different results
- Maximum 3 questions, each under 30 words
- If the instruction is specific enough, return complete: true with empty questions
- Focus on what the AI model will interpret differently without specification
- Do NOT ask about things already specified in the prompt
- Be practical, not pedantic — skip trivial details`;
  }

  return `You are analyzing a prompt for ${stageName} image generation.

User's prompt:
"${userPrompt}"
${imageContext}

Your job: identify details the user has NOT specified that could lead to undesirable results. Image generation models commonly produce artifacts when details are left ambiguous.

Stage-specific concerns for ${stageName}:
${concerns}

Respond with valid JSON only, no markdown:
{
  "complete": true/false,
  "questions": ["question 1", "question 2", ...]
}

Rules:
- Only flag genuinely ambiguous details that could produce visibly different results
- Maximum 3 questions, each under 30 words
- If the prompt is specific enough, return complete: true with empty questions
- Focus on what the AI model will interpret differently without specification
- Do NOT ask about things already specified in the prompt
- Be practical, not pedantic — skip trivial details`;
}

export function completenessCheckChatPrompt(
  stageNum: number,
  originalPrompt: string,
  questions: string[],
  isMaskRefinement: boolean
): string {
  const stageName = stageNames[stageNum] ?? "unknown";
  const context = isMaskRefinement ? "mask refinement" : "generation";

  return `You are helping a user refine their ${context} prompt for ${stageName}.

Original prompt: "${originalPrompt}"

Questions that were asked about unspecified details:
${questions.map((q, i) => `${i + 1}. ${q}`).join("\n")}

Based on the user's responses, create an enhanced version of their original prompt that incorporates all the specified details naturally. The enhanced prompt should read as a single coherent instruction, not a list of answers.

You MUST respond with valid JSON only, no markdown:
{
  "message": "Short friendly summary of what you added to their prompt (1-2 sentences)",
  "enhancedPrompt": "The complete enhanced prompt ready for generation"
}`;
}

export function searchQuerySuggestionPrompt(
  projectDescription: string
): string {
  return `Based on the following project description for a fashion photoshoot, suggest 2-3 short Pinterest search queries that would help find relevant visual references (moodboard images).

Project description:
${projectDescription}

Return only the search queries, one per line. Keep each query under 5 words. Focus on the most distinctive visual elements described.`;
}
