"use client";

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { STAGE_NAMES, type Project } from "@/types";

function formatRelativeTime(dateString: string): string {
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const diffMs = now - then;

  const minutes = Math.floor(diffMs / 60_000);
  const hours = Math.floor(diffMs / 3_600_000);
  const days = Math.floor(diffMs / 86_400_000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function statusBadgeVariant(status: Project["status"]) {
  switch (status) {
    case "active":
      return "default" as const;
    case "completed":
      return "outline" as const;
    case "archived":
      return "secondary" as const;
  }
}

interface ProjectCardProps {
  project: Project;
  onClick?: () => void;
}

export function ProjectCard({ project, onClick }: ProjectCardProps) {
  const stageProgress = (project.current_stage / STAGE_NAMES.length) * 100;
  const stageName = STAGE_NAMES[project.current_stage - 1] ?? "Unknown";
  const badgeVariant = statusBadgeVariant(project.status);

  return (
    <Card
      className={cn(
        "transition-colors",
        onClick && "cursor-pointer hover:bg-muted/50"
      )}
      onClick={onClick}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle>{project.name}</CardTitle>
            {project.employer_name && (
              <CardDescription>{project.employer_name}</CardDescription>
            )}
          </div>
          <Badge
            variant={badgeVariant}
            className={cn(
              "shrink-0 capitalize",
              project.status === "completed" && "border-green-600 text-green-600 dark:border-green-500 dark:text-green-500"
            )}
          >
            {project.status}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Stage {project.current_stage} of {STAGE_NAMES.length}: {stageName}
          </span>
          <span>{Math.round(stageProgress)}%</span>
        </div>
        <Progress value={stageProgress} />
      </CardContent>

      <CardFooter>
        <span className="text-xs text-muted-foreground">
          Last updated {formatRelativeTime(project.updated_at)}
        </span>
      </CardFooter>
    </Card>
  );
}
