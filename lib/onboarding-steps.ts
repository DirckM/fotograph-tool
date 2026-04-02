import { DEMO_PROJECT } from "./onboarding-demo";

export interface WorkflowStage {
  number: number;
  name: string;
  description: string;
}

export interface TourFeature {
  label: string;
  description: string;
}

export type StepAction =
  | { type: "navigate"; path: string }
  | { type: "typeInto"; selector: string; text: string; speed?: number }
  | { type: "click"; selector: string }
  | { type: "waitFor"; selector: string; timeout?: number }
  | { type: "delay"; ms: number }
  | { type: "approveStage"; stage: number }
  | { type: "pressEscape" };

export interface TourStep {
  target: string | null;
  title: string;
  subtitle?: string;
  content: string;
  placement: "top" | "bottom" | "left" | "right" | "center";
  icon?: "welcome" | "complete" | "rocket" | "stage";
  stages?: WorkflowStage[];
  features?: TourFeature[];
  demo?: "mask";
  setup?: StepAction[];
  animate?: StepAction[];
}

// ================================================================
//  Phase 1 — Platform overview (sidebar)
// ================================================================

const SIDEBAR_STEPS: TourStep[] = [
  {
    target: null,
    title: "Welcome to Fotograph",
    subtitle: "AI-powered photography platform",
    content: "Let me walk you through the key features so you can get started quickly.",
    placement: "center",
    icon: "welcome",
  },
  {
    target: "sidebar-projects",
    title: "Projects",
    content: "Your photoshoot projects live here. Each one guides you through a 6-stage workflow.",
    placement: "right",
  },
  {
    target: "sidebar-moodboard",
    title: "Moodboard Library",
    content: "Browse and organize reference images. Search Pinterest, upload your own, or reuse from past projects.",
    placement: "right",
  },
  {
    target: "sidebar-tools",
    title: "Quick Tools",
    content: "Standalone tools -- Upscale, Face Swap, Try-On, Consistency, and Adjust.",
    placement: "right",
  },
  {
    target: "sidebar-history",
    title: "Job History",
    content: "Every generation is saved here. Review results and track your work.",
    placement: "right",
  },
];

// ================================================================
//  Phase 2 — Create a project
// ================================================================

const PROJECT_STEPS: TourStep[] = [
  {
    target: null,
    title: "Let's create a project",
    content: "I'll walk you through the full workflow step by step. Watch as I fill in the fields.",
    placement: "center",
    icon: "rocket",
    setup: [
      { type: "navigate", path: "/dashboard/projects/new" },
      { type: "delay", ms: 600 },
    ],
  },
  {
    target: "[data-tour='new-project-form']",
    title: "Project details",
    content: "Every project starts with a name, description, and optional client info.",
    placement: "right",
    animate: [
      { type: "typeInto", selector: "#name", text: DEMO_PROJECT.name },
      { type: "delay", ms: 200 },
      { type: "typeInto", selector: "#description", text: DEMO_PROJECT.description },
      { type: "delay", ms: 200 },
      { type: "typeInto", selector: "#employer", text: DEMO_PROJECT.employer },
    ],
  },
];

// ================================================================
//  Phase 3 — Stage 0: Context
// ================================================================

const CONTEXT_STEPS: TourStep[] = [
  {
    target: "#context-text",
    title: "Stage 0: Context",
    content: "Describe the project brief -- goals, brand guidelines, target audience. This helps the AI understand your vision.",
    placement: "right",
    setup: [
      { type: "click", selector: "[data-tour='new-project-submit']" },
      { type: "waitFor", selector: "#context-text", timeout: 12000 },
      { type: "delay", ms: 800 },
    ],
    animate: [
      { type: "typeInto", selector: "#context-text", text: DEMO_PROJECT.context },
    ],
  },
];

// ================================================================
//  Phase 4 — Stage 1: Model
// ================================================================

const MODEL_STEPS: TourStep[] = [
  {
    target: "#model-description",
    title: "Stage 1: Model",
    content: "Be specific -- age, skin tone, hair, facial structure. More detail means better results.",
    placement: "right",
    setup: [
      { type: "click", selector: "[data-tour='context-save']" },
      { type: "waitFor", selector: "#model-description", timeout: 12000 },
      { type: "delay", ms: 800 },
    ],
    animate: [
      { type: "typeInto", selector: "#model-description", text: DEMO_PROJECT.modelDescription },
    ],
  },
  {
    target: "[data-tour='model-moodboard']",
    title: "Browse the Moodboard",
    content: "Let me open the moodboard library so you can see how it works. You can search Pinterest, upload images, or reuse from past projects.",
    placement: "bottom",
    animate: [
      { type: "delay", ms: 800 },
      { type: "click", selector: "[data-tour='moodboard-trigger']" },
      { type: "delay", ms: 600 },
      { type: "click", selector: "[data-tour='moodboard-library-tab']" },
      { type: "waitFor", selector: "[data-tour='moodboard-library-grid']", timeout: 5000 },
      { type: "delay", ms: 1000 },
      { type: "click", selector: "[data-tour='moodboard-library-first-add']" },
      { type: "delay", ms: 1200 },
    ],
  },
  {
    target: "[data-tour='model-generate']",
    setup: [
      { type: "pressEscape" },
      { type: "delay", ms: 400 },
    ],
    title: "Generate Face",
    content: "Click Generate to create the face. The AI analyzes your references and may ask clarifying questions in the chat.",
    placement: "top",
  },
  {
    target: null,
    title: "Refinement & Masking",
    subtitle: "Fine-tune specific areas after generation",
    content: "After generating, you can paint a mask over any area you want to change, describe what should be different, and the AI will refine just that area.",
    placement: "center",
    icon: "stage",
    demo: "mask",
  },
];

// ================================================================
//  Phase 5 — Stage 2: Environment (navigate for real)
// ================================================================

const ENVIRONMENT_STEPS: TourStep[] = [
  {
    target: "#env-prompt",
    title: "Stage 2: Environment",
    content: "Describe the background and setting for your photoshoot. The more vivid your description, the better the result.",
    placement: "left",
    setup: [
      { type: "approveStage", stage: 1 },
      { type: "waitFor", selector: "#env-prompt", timeout: 12000 },
      { type: "delay", ms: 800 },
    ],
    animate: [
      { type: "typeInto", selector: "#env-prompt", text: DEMO_PROJECT.envPrompt },
    ],
  },
  {
    target: "[data-tour='env-options']",
    title: "Lighting & Mood",
    content: "Fine-tune the atmosphere with preset options for lighting, time of day, camera angle, and mood. Click to expand and select.",
    placement: "left",
    animate: [
      { type: "click", selector: "[data-tour='env-options']" },
    ],
  },
  {
    target: "[data-tour='env-generate']",
    title: "Generate Environment",
    content: "After generation, you can refine the result with the mask painter -- same workflow as the model stage.",
    placement: "top",
  },
];

// ================================================================
//  Phase 6 — Stage 3: Pose (navigate for real)
// ================================================================

const POSE_STEPS: TourStep[] = [
  {
    target: "#pose-prompt",
    title: "Stage 3: Pose",
    content: "Describe the body positioning and gestures. Add reference images showing poses you like.",
    placement: "left",
    setup: [
      { type: "approveStage", stage: 2 },
      { type: "waitFor", selector: "#pose-prompt", timeout: 12000 },
      { type: "delay", ms: 800 },
    ],
    animate: [
      { type: "typeInto", selector: "#pose-prompt", text: DEMO_PROJECT.posePrompt },
    ],
  },
  {
    target: "[data-tour='pose-generate']",
    title: "Generate Pose",
    content: "The AI will generate the pose. You can then refine with masks and add reference images, just like previous stages.",
    placement: "top",
  },
];

// ================================================================
//  Phase 7 — Stage 4: Garment (navigate for real)
// ================================================================

const GARMENT_STEPS: TourStep[] = [
  {
    target: "[data-tour='garment-upload']",
    title: "Stage 4: Garment",
    content: "Upload photos of the garment from any angle. The AI can auto-generate additional perspectives from a single photo.",
    placement: "left",
    setup: [
      { type: "approveStage", stage: 3 },
      { type: "waitFor", selector: "[data-tour='garment-upload']", timeout: 12000 },
      { type: "delay", ms: 800 },
    ],
  },
];

// ================================================================
//  Phase 8 — Stage 5: Final (navigate for real)
// ================================================================

const FINAL_STEPS: TourStep[] = [
  {
    target: "[data-tour='final-assets']",
    title: "Stage 5: Final",
    content: "Review all assets from previous stages. The AI combines your model, environment, pose, and garment into a final composite photograph.",
    placement: "left",
    setup: [
      { type: "approveStage", stage: 4 },
      { type: "waitFor", selector: "[data-tour='final-assets']", timeout: 12000 },
      { type: "delay", ms: 800 },
    ],
  },
  {
    target: "[data-tour='final-generate']",
    title: "Generate Composite",
    content: "Click Generate to create the final image. Then mark the project as complete. You can generate multiple composites.",
    placement: "left",
  },
];

// ================================================================
//  Phase 9 — Done
// ================================================================

const COMPLETION_STEPS: TourStep[] = [
  {
    target: null,
    title: "You're all set!",
    content: "You've seen the full workflow. Go back to your project, add real references, and start generating. Restart this tour anytime from the sidebar.",
    placement: "center",
    icon: "complete",
    setup: [
      { type: "navigate", path: "/dashboard/projects" },
      { type: "delay", ms: 500 },
    ],
  },
];

// ================================================================
//  Combined
// ================================================================

export const TOUR_STEPS: TourStep[] = [
  ...SIDEBAR_STEPS,
  ...PROJECT_STEPS,
  ...CONTEXT_STEPS,
  ...MODEL_STEPS,
  ...ENVIRONMENT_STEPS,
  ...POSE_STEPS,
  ...GARMENT_STEPS,
  ...FINAL_STEPS,
  ...COMPLETION_STEPS,
];

export const ONBOARDING_STORAGE_KEY = "fotograph-onboarding-completed";
