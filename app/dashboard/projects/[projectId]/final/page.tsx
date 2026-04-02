"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { JobStatus } from "@/components/job-status";
import { AssetGrid } from "@/components/projects/asset-grid";
import { StageGate } from "@/components/projects/stage-gate";
import { StageLayout } from "@/components/projects/stage-layout";
import { useHelpChat } from "@/components/projects/help-chat-context";
import type { Project, ProjectAsset, Job } from "@/types";

const STAGE_LABELS: Record<number, string> = {
  1: "Face Model",
  2: "Environment",
  3: "Pose",
  4: "Garment",
};

function getImageUrl(asset: ProjectAsset): string | null {
  return asset.external_url ?? asset.storage_path ?? null;
}

export default function FinalStagePage() {
  const { projectId } = useParams<{ projectId: string }>();
  const router = useRouter();
  const { setChatState, clearChatState } = useHelpChat();

  const [project, setProject] = useState<Project | null>(null);
  const [allAssets, setAllAssets] = useState<ProjectAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [projectRes, assetsRes] = await Promise.all([
        fetch(`/api/projects/${projectId}`),
        fetch(`/api/projects/${projectId}/assets`),
      ]);

      if (projectRes.ok) {
        setProject(await projectRes.json());
      }
      if (assetsRes.ok) {
        setAllAssets(await assetsRes.json());
      }
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const assetsByStage = (stage: number) =>
    allAssets.filter((a) => a.stage === stage);

  const composites = allAssets.filter(
    (a) => a.stage === 5 && a.asset_type === "final_composite"
  );

  const handleGenerate = useCallback(async (overridePrompt?: string, skip?: boolean) => {
    if (!project) return;

    setGenerating(true);

    const imagePaths = [1, 2, 3, 4].flatMap((stage) =>
      assetsByStage(stage)
        .map((a) => getImageUrl(a))
        .filter(Boolean)
    ) as string[];

    try {
      const res = await fetch(
        `/api/projects/${projectId}/stage/5/generate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: overridePrompt || project.description || project.name,
            imagePaths,
            skipCompletenessCheck: skip ?? false,
            enhancedPrompt: overridePrompt || undefined,
          }),
        }
      );

      if (res.ok) {
        const data = await res.json();
        if (data.needsClarification && data.clarificationType === "completeness-check") {
          setGenerating(false);
          setChatState({
            completenessCheck: {
              stage: data.stage,
              originalPrompt: data.originalPrompt,
              questions: data.questions,
              isMaskRefinement: false,
            },
            onEnhancedPromptConfirm: (enhancedPrompt: string) => {
              clearChatState();
              handleGenerate(enhancedPrompt, true);
            },
          });
          return;
        }
        setJobId(data.id);
      } else {
        setGenerating(false);
      }
    } catch {
      setGenerating(false);
    }
  }, [project, projectId, allAssets, setChatState, clearChatState]);

  const handleJobComplete = useCallback(
    async (job: Job) => {
      setGenerating(false);
      setJobId(null);

      if (job.result_image) {
        const assetRes = await fetch(`/api/projects/${projectId}/assets`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            stage: 5,
            asset_type: "final_composite",
            source: "gemini",
            storage_path: job.result_image,
          }),
        });

        if (assetRes.ok) {
          const asset: ProjectAsset = await assetRes.json();
          setAllAssets((prev) => [...prev, asset]);
        }
      }
    },
    [projectId]
  );

  const handleComplete = useCallback(async () => {
    setCompleting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      });

      if (res.ok) {
        router.push(`/dashboard/projects`);
      }
    } finally {
      setCompleting(false);
    }
  }, [projectId, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!project) return null;

  return (
    <StageGate currentStage={project.current_stage} requiredStage={5}>
      <StageLayout
        title={<>Stage 5: <span className="text-heading">Final</span> Compositing</>}
        description="Combine all approved assets into final composite images."
        aside={
          <div className="space-y-4">
            <div className="space-y-3">
              <Label>Generation</Label>
              <Button
                className="w-full"
                onClick={() => handleGenerate()}
                disabled={generating}
                data-tour="final-generate"
              >
                {generating ? "Generating..." : "Generate Series"}
              </Button>
              <JobStatus jobId={jobId} onComplete={handleJobComplete} />
            </div>

            {composites.length > 0 && (
              <div className="space-y-3 pt-4 border-t border-border/50">
                <Label>Project</Label>
                <Button
                  size="lg"
                  className="w-full"
                  onClick={handleComplete}
                  disabled={completing}
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  {completing ? "Completing..." : "Complete Project"}
                </Button>
              </div>
            )}
          </div>
        }
      >
        <div className="space-y-6 overflow-y-auto">
          <div className="space-y-3">
            <Label className="text-sm text-muted-foreground" data-tour="final-assets">Asset Summary</Label>
            <div className="grid gap-4 sm:grid-cols-2">
              {[1, 2, 3, 4].map((stage) => {
                const stageAssets = assetsByStage(stage);
                return (
                  <div key={stage} className="space-y-2 rounded-lg border border-border/50 p-3">
                    <p className="text-sm font-medium text-muted-foreground">
                      {STAGE_LABELS[stage]}
                    </p>
                    {stageAssets.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No assets</p>
                    ) : (
                      <div className="grid grid-cols-3 gap-1">
                        {stageAssets.slice(0, 6).map((asset) => {
                          const url = getImageUrl(asset);
                          return url ? (
                            <div
                              key={asset.id}
                              className="relative aspect-square overflow-hidden rounded"
                            >
                              <Image
                                src={url}
                                alt={asset.role ?? STAGE_LABELS[stage]}
                                fill
                                className="object-cover"
                                sizes="80px"
                              />
                            </div>
                          ) : null;
                        })}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {stageAssets.length} asset{stageAssets.length !== 1 && "s"}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {composites.length > 0 && (
            <div className="space-y-3">
              <Label className="text-sm text-muted-foreground">
                Final Composites ({composites.length})
              </Label>
              <AssetGrid assets={composites} columns={3} />
            </div>
          )}
        </div>
      </StageLayout>
    </StageGate>
  );
}
