"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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

const SUPABASE_STORAGE_BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/project-assets/`;

function getImageUrl(asset: ProjectAsset): string | null {
  if (asset.external_url) return asset.external_url;
  if (!asset.storage_path) return null;
  if (asset.storage_path.startsWith("http")) return asset.storage_path;
  return `${SUPABASE_STORAGE_BASE}${asset.storage_path}`;
}

export default function FinalStagePage() {
  const { projectId } = useParams<{ projectId: string }>();
  const router = useRouter();
  const { setChatState, clearChatState } = useHelpChat();

  const [project, setProject] = useState<Project | null>(null);
  const [allAssets, setAllAssets] = useState<ProjectAsset[]>([]);
  const [stageResults, setStageResults] = useState<Record<number, string | null>>({});
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [projectRes, assetsRes, stage2Res, stage3Res] = await Promise.all([
        fetch(`/api/projects/${projectId}`),
        fetch(`/api/projects/${projectId}/assets`),
        fetch(`/api/projects/${projectId}/stage/2`),
        fetch(`/api/projects/${projectId}/stage/3`),
      ]);

      if (projectRes.ok) {
        setProject(await projectRes.json());
      }
      let assets: ProjectAsset[] = [];
      if (assetsRes.ok) {
        assets = await assetsRes.json();
        setAllAssets(assets);
      }

      const results: Record<number, string | null> = {};

      // Stage 1: refined_face or generated_face asset
      const face = assets.findLast((a) => a.asset_type === "refined_face")
        ?? assets.findLast((a) => a.asset_type === "generated_face");
      results[1] = face ? getImageUrl(face) : null;

      // Stage 2 & 3: resultImage from stage state
      if (stage2Res.ok) {
        const s2 = await stage2Res.json();
        results[2] = s2.state?.resultImage ?? null;
      }
      if (stage3Res.ok) {
        const s3 = await stage3Res.json();
        results[3] = s3.state?.resultImage ?? null;
      }

      setStageResults(results);
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
        guide={[
          "Review the summary below - it shows your approved model, environment, pose, and garments from all previous stages.",
          "Click 'Generate Series' to composite everything together. The AI combines the model's face, the environment, the pose, and each garment into final photoshoot images.",
          "You can generate multiple times to get different variations. Each generation adds to the gallery, nothing gets replaced.",
          "When you're happy with the results, click 'Complete Project' to mark the project as finished.",
        ]}
        guideTip="Each generation creates one composite per garment. If you have 3 garments, you'll get 3 final images per generation. Use the tools (upscaler, face swap) from the sidebar to post-process individual results."
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
            <Label className="text-sm text-muted-foreground" data-tour="final-assets">Stage Results</Label>
            <div className="grid gap-4 sm:grid-cols-2">
              {[1, 2, 3].map((stage) => {
                const url = stageResults[stage];
                return (
                  <div key={stage} className="space-y-2 rounded-lg border border-border/50 p-3">
                    <p className="text-sm font-medium text-muted-foreground">
                      {STAGE_LABELS[stage]}
                    </p>
                    {url ? (
                      <div className="relative aspect-square overflow-hidden rounded">
                        <img
                          src={url}
                          alt={STAGE_LABELS[stage]}
                          className="absolute inset-0 h-full w-full object-cover"
                        />
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">No result yet</p>
                    )}
                  </div>
                );
              })}
              <div className="space-y-2 rounded-lg border border-border/50 p-3">
                <p className="text-sm font-medium text-muted-foreground">
                  {STAGE_LABELS[4]}
                </p>
                {(() => {
                  const garments = allAssets.filter((a) => a.stage === 4 && a.asset_type === "garment_image");
                  if (garments.length === 0) {
                    return <p className="text-xs text-muted-foreground">No garments</p>;
                  }
                  return (
                    <div className={`grid gap-1 ${garments.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
                      {garments.map((asset) => {
                        const url = getImageUrl(asset);
                        return url ? (
                          <div
                            key={asset.id}
                            className="relative aspect-square overflow-hidden rounded"
                          >
                            <img
                              src={url}
                              alt="Garment"
                              className="absolute inset-0 h-full w-full object-cover"
                            />
                          </div>
                        ) : null;
                      })}
                    </div>
                  );
                })()}
              </div>
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
