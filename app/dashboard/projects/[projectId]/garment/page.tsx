"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Shirt, Loader2, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageUpload } from "@/components/image-upload";
import { JobStatus } from "@/components/job-status";
import { AssetGrid } from "@/components/projects/asset-grid";
import { StageGate } from "@/components/projects/stage-gate";
import { useFileUpload } from "@/lib/hooks";
import type { Project, ProjectAsset, Job } from "@/types";

const PERSPECTIVE_ANGLES = [
  "front three-quarter left",
  "front three-quarter right",
  "left profile",
  "right profile",
];

export default function GarmentStagePage() {
  const { projectId } = useParams<{ projectId: string }>();
  const router = useRouter();
  const { upload, uploading } = useFileUpload();

  const [project, setProject] = useState<Project | null>(null);
  const [assets, setAssets] = useState<ProjectAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [perspJobId, setPerspJobId] = useState<string | null>(null);
  const [generatingPerspectives, setGeneratingPerspectives] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [projectRes, assetsRes] = await Promise.all([
        fetch(`/api/projects/${projectId}`),
        fetch(`/api/projects/${projectId}/assets?stage=4`),
      ]);

      if (projectRes.ok) {
        setProject(await projectRes.json());
      }
      if (assetsRes.ok) {
        setAssets(await assetsRes.json());
      }
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleUpload = useCallback(
    async (file: File) => {
      const result = await upload(file);

      const assetRes = await fetch(`/api/projects/${projectId}/assets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage: 4,
          asset_type: "garment_image",
          source: "upload",
          storage_path: result.publicUrl,
        }),
      });

      if (assetRes.ok) {
        const asset: ProjectAsset = await assetRes.json();
        setAssets((prev) => [...prev, asset]);
      }
    },
    [projectId, upload]
  );

  const handleRemove = useCallback(
    async (assetId: string) => {
      const res = await fetch(
        `/api/projects/${projectId}/assets/${assetId}`,
        { method: "DELETE" }
      );

      if (res.ok) {
        setAssets((prev) => prev.filter((a) => a.id !== assetId));
      }
    },
    [projectId]
  );

  const handleGeneratePerspectives = useCallback(async () => {
    if (assets.length !== 1) return;

    const sourceUrl = assets[0].storage_path ?? assets[0].external_url;
    if (!sourceUrl) return;

    setGeneratingPerspectives(true);

    try {
      const res = await fetch("/api/generate-perspective", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imagePath: sourceUrl,
          angle: PERSPECTIVE_ANGLES[0],
        }),
      });

      if (res.ok) {
        const job = await res.json();
        setPerspJobId(job.id);
      }
    } catch {
      setGeneratingPerspectives(false);
    }
  }, [assets]);

  const handlePerspJobComplete = useCallback(
    async (job: Job) => {
      setGeneratingPerspectives(false);
      setPerspJobId(null);

      if (job.result_image) {
        const assetRes = await fetch(`/api/projects/${projectId}/assets`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            stage: 4,
            asset_type: "garment_image",
            source: "gemini",
            storage_path: job.result_image,
          }),
        });

        if (assetRes.ok) {
          const asset: ProjectAsset = await assetRes.json();
          setAssets((prev) => [...prev, asset]);
        }
      }
    },
    [projectId]
  );

  const handleApprove = useCallback(async () => {
    setApproving(true);
    try {
      const res = await fetch(
        `/api/projects/${projectId}/stage/4/approve`,
        { method: "POST" }
      );

      if (res.ok) {
        router.push(`/dashboard/projects/${projectId}/final`);
      }
    } finally {
      setApproving(false);
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
    <StageGate currentStage={project.current_stage} requiredStage={4}>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-medium">
            <Shirt className="h-5 w-5" />
            Garment <span className="font-serif">Importation</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload garment reference images. If you only have one angle, generate additional perspectives automatically.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Upload Garment Images</CardTitle>
          </CardHeader>
          <CardContent>
            <ImageUpload
              onUpload={handleUpload}
              label="Upload garment image"
              description="Upload photos of the garment from different angles"
              className="min-h-40"
            />
            {uploading && (
              <p className="mt-2 text-sm text-muted-foreground">
                Uploading...
              </p>
            )}
          </CardContent>
        </Card>

        {assets.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Garment Images ({assets.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <AssetGrid assets={assets} onRemove={handleRemove} />

              {assets.length === 1 && (
                <Button
                  variant="outline"
                  onClick={handleGeneratePerspectives}
                  disabled={generatingPerspectives}
                >
                  <RotateCw className="mr-2 h-4 w-4" />
                  {generatingPerspectives
                    ? "Generating..."
                    : "Generate More Angles"}
                </Button>
              )}

              <JobStatus
                jobId={perspJobId}
                onComplete={handlePerspJobComplete}
              />
            </CardContent>
          </Card>
        )}

        {assets.length > 0 && (
          <div className="flex justify-end">
            <Button
              size="lg"
              onClick={handleApprove}
              disabled={approving}
            >
              {approving ? "Approving..." : "Approve & Continue"}
            </Button>
          </div>
        )}
      </div>
    </StageGate>
  );
}
