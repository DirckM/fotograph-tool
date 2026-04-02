# Pre-Generation Completeness Check

## Problem

When generating images, users often leave details unspecified (finger positioning, lighting direction, fabric texture, nail color, etc.). This leads to undesirable results and expensive re-generations. A cheap text-only AI call before generation can surface these gaps and save costs.

## Design

### Core Concept

Before any image generation or mask refinement, the API makes a cheap `generateText()` call (gemini-2.5-flash) to analyze the prompt + stage context. If it finds unspecified details that could cause issues, it returns questions instead of generating. The user answers in chat, reviews the enhanced prompt, and confirms before the image is generated.

### API Changes

#### Generate endpoint (`/api/projects/[projectId]/stage/[stage]/generate/route.ts`)

New optional request body fields:
```typescript
{
  // existing fields...
  skipCompletenessCheck?: boolean;  // bypass check after user confirmed enhanced prompt
  enhancedPrompt?: string;          // the AI-improved prompt user confirmed
}
```

Flow:
1. If `skipCompletenessCheck` is true and `enhancedPrompt` is provided, use `enhancedPrompt` as the prompt and proceed to generation
2. Otherwise, call `checkPromptCompleteness()` with the prompt, stage, and image context
3. If gaps found: return `{ needsClarification: true, questions: string[], stageContext: string }` with no image generated
4. If prompt is complete: proceed to generation as normal

#### Mask-refine endpoint (`/api/projects/[projectId]/stage/[stage]/mask-refine/route.ts`)

Same pattern. New optional fields:
```typescript
{
  // existing fields...
  skipCompletenessCheck?: boolean;
  enhancedPrompt?: string;
}
```

Same flow as generate endpoint, but the completeness check prompt is tailored for mask refinement context (analyzing what the user wants changed in the masked region).

### New Prompt Template

`lib/prompts.ts` gets a new function:

```typescript
function completenessCheckPrompt(
  stage: string,           // "model" | "environment" | "pose" | "final"
  userPrompt: string,
  isMaskRefinement: boolean,
  imageDescriptions?: string[]  // descriptions of reference images if any
): string
```

The prompt asks the AI to:
- Analyze what the user has specified
- Identify details that are ambiguous or unspecified that could lead to undesirable results
- Focus on visual details that image generation models commonly get wrong when unspecified
- Return a JSON response: `{ complete: boolean, questions: string[] }`

Stage-specific concerns:
- **Model**: facial features, skin texture, hair details, expression, gaze direction
- **Environment**: lighting direction/color, time of day, depth of field, surface materials
- **Pose**: hand positioning, finger spread, weight distribution, joint angles
- **Final composite**: color grading, shadow consistency, scale/perspective alignment

### Chat Integration

New mode in `/api/chat/route.ts`: `context: "completeness-check"`

Request:
```typescript
{
  messages: [...],
  context: "completeness-check",
  completenessCheck: {
    stage: string,
    originalPrompt: string,
    questions: string[],
    isMaskRefinement: boolean,
  }
}
```

The system prompt for this mode instructs the AI to:
- Process the user's answers to the completeness questions
- Generate an enhanced version of the original prompt incorporating all answers
- Return: `{ message: string, enhancedPrompt: string }`

The `message` is shown in chat. The `enhancedPrompt` is displayed for user review.

### Frontend Changes

#### Stage pages (model, environment, pose, final)

When the generate/mask-refine API returns `needsClarification`:
1. Open the help chat panel
2. Display the AI's questions as a chat message
3. User responds conversationally
4. After user answers, call `/api/chat` with `context: "completeness-check"` to get the enhanced prompt
5. Show the enhanced prompt in chat for review
6. User confirms (button in chat or clicks Generate again)
7. Re-send to generate/mask-refine with `skipCompletenessCheck: true` and `enhancedPrompt`

#### Help chat component (`components/help-chat.tsx`)

- Handle new "completeness-check" mode
- Show enhanced prompt in a reviewable format (slightly different styling so it stands out)
- Add a "Use this prompt" / "Generate with this" confirmation button
- On confirm, trigger the parent's generate function with the enhanced prompt

### What stays unchanged

- Existing reference note clarification flow (Stage 1 model)
- All existing prompt templates
- Job processing pipeline (`lib/process-job.ts`)
- Asset management
- Moodboard functionality

## Files to modify

1. `lib/prompts.ts` - add `completenessCheckPrompt()` and `completenessCheckChatPrompt()`
2. `app/api/projects/[projectId]/stage/[stage]/generate/route.ts` - add pre-check step
3. `app/api/projects/[projectId]/stage/[stage]/mask-refine/route.ts` - add pre-check step
4. `app/api/chat/route.ts` - add completeness-check mode
5. `components/help-chat.tsx` - handle completeness check questions and enhanced prompt display
6. `components/projects/help-chat-context.tsx` - extend context for completeness check state
7. `app/dashboard/projects/[projectId]/model/page.tsx` - handle needsClarification response
8. `app/dashboard/projects/[projectId]/environment/page.tsx` - same
9. `app/dashboard/projects/[projectId]/pose/page.tsx` - same
10. `app/dashboard/projects/[projectId]/final/page.tsx` - same

## Cost analysis

- Completeness check: ~1 gemini-2.5-flash text call per generation attempt (very cheap)
- If clarification needed: +1 more text call for chat processing
- Trade-off: 1-2 cheap text calls vs potentially saving 1+ expensive image generation calls
