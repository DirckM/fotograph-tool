import "server-only";
import { generateText } from "@/lib/gemini";

export interface RefinedNote {
  original: string;
  refined: string;
  question?: string;
  options?: string[];
}

export interface ReferenceWarning {
  hasConflict: boolean;
  warnings: string[];
}

/**
 * Looks at each reference image + the user's vague note and translates it
 * into a precise, actionable description of what to extract.
 */
export async function refineReferenceNotes(
  description: string,
  images: { mimeType: string; data: string }[],
  notes: string[]
): Promise<RefinedNote[]> {
  const results = await Promise.all(
    images.map(async (image, i) => {
      const userNote = notes[i] ?? "";
      if (!userNote.trim()) {
        return { original: userNote, refined: "" };
      }

      const prompt = `You are a visual analysis assistant for a fashion model AI generator.

The user is generating a model with this description:
"${description}"

They selected this reference image and wrote this note:
"${userNote}"

Look at the reference image and the user's note. Your job is to translate the note into a precise description of what traits to extract, while RESPECTING the model description.

CRITICAL RULE: The model description is the source of truth. If a trait in the reference image conflicts with the description (e.g., description says "red-blonde hair" but image shows dark hair), do NOT include that trait in the refined note. Only extract traits that are compatible with the description.

When the note is vague (e.g., "I want his face", "use her look") AND the reference image has traits that conflict with the description, you MUST ask a clarification question so the user can specify which traits to keep.

Respond with ONLY valid JSON (no markdown):
{
  "refined": "the refined note describing only compatible traits to extract",
  "question": "a short clarification question if the note is ambiguous and there are conflicts, or null if clear",
  "options": ["trait 1 from image", "trait 2 from image", ...] or null
}

When there IS a question, always provide "options": a list of specific visual traits visible in the reference image that the user might want. Each option should be a short, concrete trait label. Always include all plausible traits the user might want, even conflicting ones. The user can pick multiple.

Examples:

Note: "I want his face" + description says "red-blonde hair" + image shows dark curly hair, blue eyes, strong jaw, freckles:
{"refined": "Use the strong jawline and prominent cheekbones", "question": "Your description says red-blonde hair but this reference has dark curly hair. Which traits do you want from this face?", "options": ["Strong jawline", "Prominent cheekbones", "Blue eyes", "Nose shape", "Freckles", "Skin texture", "Lip shape", "Dark curly hair (override description)"]}

Note: "I want his freckles" + image shows freckled face:
{"refined": "Dense, prominent light brown freckles scattered across the nose, cheeks, forehead, and chin", "question": null, "options": null}

Note: "nice hair" + description says "short cropped hair" + image shows long flowing blonde hair:
{"refined": "", "question": "Your description says short cropped hair. What do you want from this reference?", "options": ["Blonde hair color", "Hair texture", "Long flowing style (override description)"]}

Note: "I want her face" + description matches the reference well:
{"refined": "Use the high cheekbones, almond-shaped green eyes, straight nose bridge, and full lips with a natural Cupid's bow", "question": null, "options": null}

Rules:
- Be specific about colors, patterns, shapes, textures
- Keep the refined note to 1-2 sentences max
- Do NOT include gender or identity — just visual traits
- Options should be short labels (2-5 words), not full sentences
- Include 4-8 options when asking a question
- Questions should be short and friendly`;

      try {
        const raw = await generateText(prompt, [image]);
        const cleaned = raw.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(cleaned) as { refined: string; question: string | null; options: string[] | null };
        return {
          original: userNote,
          refined: parsed.refined?.trim() ?? userNote,
          question: parsed.question ?? undefined,
          options: parsed.options ?? undefined,
        };
      } catch (err) {
        console.error(`[refineReferenceNotes] Failed for note "${userNote}":`, err);
        return { original: userNote, refined: userNote };
      }
    })
  );

  return results;
}

/**
 * Checks for conflicts between the model description and the refined
 * reference notes (e.g. asking to copy a female face onto a male model).
 */
export async function checkReferenceConflicts(
  description: string,
  refinedNotes: string
): Promise<ReferenceWarning> {
  const prompt = `You are a pre-flight validator for an AI image generation tool.

The user wants to generate a fashion model portrait with this description:
"${description}"

They have selected reference images with these notes:
${refinedNotes}

Your job: detect conflicts where a reference note asks to copy an identity trait (face shape, full face, overall look) from a reference that likely contradicts the description's gender, age, or ethnicity.

Rules:
- Borrowing a FEATURE (freckles, skin texture, eye color, hair style) = OK, no conflict
- Copying a FACE or IDENTITY ("use her face", "should look like him", "I want his/her look") from a reference whose apparent gender/age contradicts the description = CONFLICT

Respond with ONLY valid JSON, no markdown:
{"hasConflict": true/false, "warnings": ["...warning message for the user..."]}

If no conflicts, return: {"hasConflict": false, "warnings": []}`;

  try {
    const raw = await generateText(prompt);
    const cleaned = raw.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleaned) as ReferenceWarning;
  } catch {
    return { hasConflict: false, warnings: [] };
  }
}
