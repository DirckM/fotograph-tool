"use client";

import { useEffect, useState } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StageStepper } from "@/components/projects/stage-stepper";
import { HelpChat } from "@/components/help-chat";
import { HelpChatProvider, useHelpChat } from "@/components/projects/help-chat-context";
import { STAGE_NAMES } from "@/types";
import type { Project } from "@/types";

const STAGE_PATHS = ["context", "model", "environment", "pose", "garment", "final"];

function LayoutHelpChat() {
  const { clarification, completenessCheck, onNoteSuggestions, onAlternativeSelected, onEnhancedPromptConfirm } = useHelpChat();
  return (
    <HelpChat
      context="project"
      clarification={clarification}
      completenessCheck={completenessCheck}
      onNoteSuggestions={onNoteSuggestions}
      onAlternativeSelected={onAlternativeSelected}
      onEnhancedPromptConfirm={onEnhancedPromptConfirm}
    />
  );
}

export default function ProjectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams<{ projectId: string }>();
  const pathname = usePathname();
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
  }, [params.projectId, pathname]);

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
    <HelpChatProvider>
      <div data-project-layout className="flex h-full flex-col overflow-hidden">
        <div className="shrink-0 border-b border-border/50 px-6 py-2.5">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() => router.push("/dashboard/projects")}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
            </Button>
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold tracking-tight">
                {project.name}
              </h1>
              {project.employer_name && (
                <p className="text-[11px] text-muted-foreground">
                  {project.employer_name}
                </p>
              )}
            </div>
            <div className="ml-2 hidden sm:block">
              <StageStepper
                currentStage={project.current_stage}
                onStageClick={handleStageClick}
              />
            </div>
            <span className="ml-auto text-xs text-muted-foreground whitespace-nowrap">
              Stage: {STAGE_NAMES[project.current_stage]}
            </span>
          </div>
        </div>

        <div className="flex min-h-0 flex-1">
          <div className="flex-1 overflow-hidden">
            {children}
          </div>
          <LayoutHelpChat />
        </div>
      </div>
    </HelpChatProvider>
  );
}
