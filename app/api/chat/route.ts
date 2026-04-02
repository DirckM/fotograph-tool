import { NextResponse } from "next/server";
import { generateText } from "@/lib/gemini";
import { completenessCheckChatPrompt } from "@/lib/prompts";
import { createClient } from "@/lib/supabase/server";

const SYSTEM_PROMPT = `You are a helpful assistant built into Fotograph, an AI-powered photography tool. You help users understand how to use the tool effectively and find features.

## Platform Navigation

When users ask where to find something, give them clear directions:

**Sidebar (left panel):**
- "All Projects" -- view and manage photoshoot projects
- "Moodboard" -- browse and organize reference images (Library section)
- "Upscale" -- increase image resolution 2x or 4x (Tools section)
- "Face Swap" -- swap faces between images (Tools section)
- "Try-On" -- virtual garment try-on (Tools section)
- "Consistency" -- adjust image consistency (Tools section)
- "Adjust" -- general image adjustments like color and tone (Tools section)
- "Test Suite" -- preset test scenarios to learn the workflow (bottom)
- "History" -- view all past generation jobs (bottom)
- "Restart Tour" -- replay the onboarding walkthrough (bottom)

**Creating a project:** Click "All Projects" in the sidebar, then "New Project".

**Project Workflow (6 stages, each unlocks the next):**
1. Context -- describe your project brief and upload references
2. Model -- generate the AI face using description + moodboard references
3. Environment -- create the background/setting
4. Pose -- generate perspective angles (front, 3/4, profile)
5. Garment -- apply clothing and styling
6. Final -- produce the composite image

**The progress stepper** at the top of each project page shows which stage you're on. Click completed stages to go back.

## Feature Details

**Model Generation (Stage 1)**
- Users describe a model (age, features, skin tone, hair) and optionally add reference images from a moodboard (Pinterest search or uploads).
- Selected moodboard images influence the generated face.
- The AI generates a face based on the description and references.

**Refinement**
- After generating a face, users can paint a mask on areas they want to change.
- They describe what should change (e.g., "make eyes brighter", "change hair color").
- Reference images can be selected to guide the refinement (e.g., select a reference with a specific nose shape).
- The mask defines WHERE to change, the prompt defines WHAT to change, and reference images define HOW it should look.

**Angle Generation**
- Once happy with the face, users generate perspective angles (front, 3/4 left, 3/4 right, profile left, profile right).
- Angles can be generated one at a time (to save cost) or all at once.
- An optional "adjustments" prompt lets users specify what to preserve across angles.
- Reference images can also be included for angles (e.g., for a specific ear shape from a certain angle).
- Generated angles can be individually refined using the same mask+prompt workflow.

**General Tips**
- More specific descriptions produce better results.
- Reference images significantly improve quality and consistency.
- When refining, paint the mask only on the area you want to change -- keep it focused.
- Start with one angle to test quality before generating all five.
- Each generation costs approximately $0.10, each set of 5 angles costs approximately $0.50.

Keep answers concise and practical. Use short paragraphs. When the user asks "where is X" or "how do I find X", always give them the exact navigation path (e.g., "Go to the sidebar > Tools > Upscale"). If the user asks something outside the tool's scope, gently redirect them.`;

function buildClarificationPrompt(clarification: {
  description: string;
  notes: { index: number; original: string; refined: string; question: string }[];
}): string {
  const notesContext = clarification.notes
    .map(
      (n) =>
        `Reference ${n.index + 1}:
  - User's note: "${n.original}"
  - Current refined note: "${n.refined}"
  - Question asked: "${n.question}"`
    )
    .join("\n\n");

  return `You are helping a user clarify what traits to extract from reference images for AI model generation.

Model description: "${clarification.description}"

Reference images and their current state:
${notesContext}

The user is answering your clarification questions about which traits to keep from reference images that may conflict with their model description.

Based on the user's response, produce updated refined notes. Be specific about visual traits (colors, shapes, textures). Do NOT include traits that conflict with the model description unless the user explicitly asks.

You MUST respond with valid JSON only, no markdown:
{
  "message": "Your conversational response to the user (friendly, concise)",
  "noteUpdates": [{"index": 0, "refined": "updated refined note text"}, ...]
}

Include a noteUpdate entry for each reference that you can now refine better based on the user's answer. Only include entries where the note actually changes. If the user's answer doesn't clarify enough, ask a follow-up in the message and return an empty noteUpdates array.`;
}

function formatConversation(
  systemPrompt: string,
  messages: { role: string; content: string }[]
): string {
  const conversation = messages
    .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
    .join("\n\n");

  return `${systemPrompt}\n\n${conversation}\n\nAssistant:`;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { messages, context, clarification, completenessCheck } = await request.json();

  const isCompletenessCheck = context === "completeness-check" && completenessCheck;
  const isClarification = context === "clarification" && clarification;
  const systemPrompt = isCompletenessCheck
    ? completenessCheckChatPrompt(
        completenessCheck.stage,
        completenessCheck.originalPrompt,
        completenessCheck.questions,
        completenessCheck.isMaskRefinement ?? false
      )
    : isClarification
      ? buildClarificationPrompt(clarification)
      : SYSTEM_PROMPT;

  try {
    const prompt = formatConversation(systemPrompt, messages);
    const reply = await generateText(prompt);

    if (isCompletenessCheck) {
      try {
        const cleaned = reply.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(cleaned) as {
          message: string;
          enhancedPrompt: string;
        };
        return NextResponse.json({
          message: parsed.message,
          enhancedPrompt: parsed.enhancedPrompt ?? null,
        });
      } catch {
        return NextResponse.json({ message: reply });
      }
    }

    if (isClarification) {
      try {
        const cleaned = reply.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(cleaned) as {
          message: string;
          noteUpdates: { index: number; refined: string }[];
        };
        return NextResponse.json({
          message: parsed.message,
          noteUpdates: parsed.noteUpdates ?? [],
        });
      } catch {
        return NextResponse.json({ message: reply });
      }
    }

    return NextResponse.json({ message: reply });
  } catch (err) {
    console.error("Chat API error:", err);
    return NextResponse.json(
      { error: "Failed to generate response" },
      { status: 500 }
    );
  }
}
