"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StageStepper } from "@/components/projects/stage-stepper";
import { STAGE_NAMES } from "@/types";
import type { Project } from "@/types";

const STAGE_PATHS = ["context", "model", "environment", "pose", "garment", "final"];

export default function ProjectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams<{ projectId: string }>();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/projects/${params.projectId}`);
      if (res.ok) {
        setProject(await res.json());
      }
    }
    load();
  }, [params.projectId]);

  function handleStageClick(stage: number) {
    router.push(
      `/dashboard/projects/${params.projectId}/${STAGE_PATHS[stage]}`
    );
  }

  if (!project) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/dashboard/projects")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-semibold tracking-tight">
            {project.name}
          </h1>
          {project.employer_name && (
            <p className="text-sm text-muted-foreground">
              {project.employer_name}
            </p>
          )}
        </div>
        <span className="text-sm text-muted-foreground">
          Stage: {STAGE_NAMES[project.current_stage]}
        </span>
      </div>

      <StageStepper
        currentStage={project.current_stage}
        onStageClick={handleStageClick}
      />

      {children}
    </div>
  );
}
