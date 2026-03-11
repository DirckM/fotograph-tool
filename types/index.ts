export type JobFeature = "upscale" | "face_swap" | "try_on" | "consistency" | "adjust" | "generate_perspective";

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
}

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
