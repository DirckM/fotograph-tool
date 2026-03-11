"use client";

import type { Job } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ZoomIn, Users, Shirt, UserCheck, Wand2, ScanFace } from "lucide-react";

const featureIcons = {
  upscale: ZoomIn,
  face_swap: Users,
  try_on: Shirt,
  consistency: UserCheck,
  adjust: Wand2,
  generate_perspective: ScanFace,
};

const featureLabels = {
  upscale: "Upscale",
  face_swap: "Face Swap",
  try_on: "Try-On",
  consistency: "Consistency",
  adjust: "Adjust",
  generate_perspective: "Generate Perspective",
};

interface HistoryCardProps {
  job: Job;
  onClick?: () => void;
}

export function HistoryCard({ job, onClick }: HistoryCardProps) {
  const Icon = featureIcons[job.feature];
  const label = featureLabels[job.feature];
  const date = new Date(job.created_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <Card
      className="cursor-pointer transition-colors hover:bg-muted/50"
      onClick={onClick}
    >
      <CardContent className="p-3">
        <div className="flex gap-3">
          {job.result_image ? (
            <img
              src={job.result_image}
              alt="Result"
              className="h-16 w-16 rounded-md object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-md bg-muted">
              <Icon className="h-6 w-6 text-muted-foreground" />
            </div>
          )}
          <div className="flex flex-1 flex-col justify-between">
            <div className="flex items-center gap-2">
              <Icon className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-sm font-medium">{label}</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant={
                  job.status === "completed"
                    ? "default"
                    : job.status === "failed"
                    ? "destructive"
                    : "secondary"
                }
                className="text-[10px]"
              >
                {job.status}
              </Badge>
              <span className="text-xs text-muted-foreground">{date}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
