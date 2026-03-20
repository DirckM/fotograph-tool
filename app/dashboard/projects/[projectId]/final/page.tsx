"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { Layers, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { JobStatus } from "@/components/job-status";
import { AssetGrid } from "@/components/projects/asset-grid";
import { StageGate } from "@/components/projects/stage-gate";
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

  const handleGenerate = useCallback(async () => {
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
            prompt: project.description ?? project.name,
            imagePaths,
          }),
        }
      );

      if (res.ok) {
        const job = await res.json();
        setJobId(job.id);
      } else {
        setGenerating(false);
      }
    } catch {
      setGenerating(false);
    }
  }, [project, projectId, allAssets]);

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
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-medium">
            <Layers className="h-5 w-5" />
            Final <span className="font-serif">Construction</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Combine all approved assets into final composite images.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((stage) => {
            const stageAssets = assetsByStage(stage);
            return (
              <Card key={stage}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {STAGE_LABELS[stage]}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {stageAssets.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      No assets
                    </p>
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
                  <p className="mt-1 text-xs text-muted-foreground">
                    {stageAssets.length} asset{stageAssets.length !== 1 && "s"}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Generate Composites</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={handleGenerate}
              disabled={generating}
            >
              {generating ? "Generating..." : "Generate Series"}
            </Button>

            <JobStatus jobId={jobId} onComplete={handleJobComplete} />
          </CardContent>
        </Card>

        {composites.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Final Composites ({composites.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AssetGrid assets={composites} columns={3} />
            </CardContent>
          </Card>
        )}

        {composites.length > 0 && (
          <div className="flex justify-end">
            <Button
              size="lg"
              onClick={handleComplete}
              disabled={completing}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              {completing ? "Completing..." : "Complete Project"}
            </Button>
          </div>
        )}
      </div>
    </StageGate>
  );
}
