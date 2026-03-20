export type JobFeature =
  | "upscale"
  | "face_swap"
  | "try_on"
  | "consistency"
  | "adjust"
  | "generate_perspective"
  | "model_generation"
  | "environment_generation"
  | "pose_generation"
  | "final_composite";

export type JobStatus = "pending" | "processing" | "completed" | "failed";

export interface Job {
  id: string;
  user_id: string;
  feature: JobFeature;
  status: JobStatus;
  input_params: Record<string, unknown>;
  input_images: string[];
  result_image: string | null;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
  project_id: string | null;
  stage: number | null;
}

export type ProjectStatus = "active" | "completed" | "archived";

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  employer_name: string | null;
  employer_notes: string | null;
  context_text: string | null;
  current_stage: number;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
}

export type AssetSource = "upload" | "pinterest" | "gemini";

export interface ProjectAsset {
  id: string;
  project_id: string;
  user_id: string;
  stage: number;
  asset_type: string;
  role: string | null;
  storage_path: string | null;
  external_url: string | null;
  source: AssetSource;
  metadata: Record<string, unknown>;
  sort_order: number;
  created_at: string;
}

export interface ProjectStageState {
  id: string;
  project_id: string;
  stage: number;
  state: Record<string, unknown>;
  approved_at: string | null;
}

export const STAGE_NAMES = [
  "Context",
  "Model",
  "Environment",
  "Pose",
  "Garment",
  "Final",
] as const;

export type StageName = (typeof STAGE_NAMES)[number];

export interface QualityLevel {
  count: number;
  label: string;
  percentage: number;
  suggestion: string;
}

export const QUALITY_LEVELS: QualityLevel[] = [
  { count: 1, label: "Basic", percentage: 25, suggestion: "Front" },
  { count: 2, label: "Good", percentage: 50, suggestion: "3/4 left" },
  { count: 3, label: "Great", percentage: 75, suggestion: "3/4 right" },
  { count: 4, label: "Very Good", percentage: 87, suggestion: "Profile" },
  { count: 5, label: "Excellent", percentage: 100, suggestion: "Slight up/down" },
];
