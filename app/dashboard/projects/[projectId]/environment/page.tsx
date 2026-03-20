"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, Sparkles, CheckCircle2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ImageUpload } from "@/components/image-upload";
import { JobStatus } from "@/components/job-status";
import { MoodboardSearch } from "@/components/projects/moodboard-search";
import { MoodboardGrid } from "@/components/projects/moodboard-grid";
import { RefinementPanel } from "@/components/projects/refinement-panel";
import { StageGate } from "@/components/projects/stage-gate";
import { useFileUpload } from "@/lib/hooks";
import type { Project, ProjectAsset, Job } from "@/types";

interface MoodboardImage {
  id: string;
  url: string;
  selected: boolean;
}

export default function EnvironmentStagePage() {
  const params = useParams<{ projectId: string }>();
  const router = useRouter();
  const { upload, uploading } = useFileUpload();

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [prompt, setPrompt] = useState("");
  const [moodboard, setMoodboard] = useState<MoodboardImage[]>([]);
  const [generating, setGenerating] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [approving, setApproving] = useState(false);
  const [refineJobId, setRefineJobId] = useState<string | null>(null);
  const [refining, setRefining] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [projectRes, assetsRes, stageRes] = await Promise.all([
          fetch(`/api/projects/${params.projectId}`),
          fetch(`/api/projects/${params.projectId}/assets?stage=2`),
          fetch(`/api/projects/${params.projectId}/stage/2`),
        ]);

        if (projectRes.ok) {
          const proj: Project = await projectRes.json();
          setProject(proj);
        }

        if (assetsRes.ok) {
          const assets: ProjectAsset[] = await assetsRes.json();
          const moodboardAssets = assets
            .filter((a) => a.asset_type === "env_moodboard")
            .map((a) => ({
              id: a.id,
              url: a.external_url ?? a.storage_path ?? "",
              selected: true,
            }));
          setMoodboard(moodboardAssets);
        }

        if (stageRes.ok) {
          const state = await stageRes.json();
          if (state.state?.prompt) setPrompt(state.state.prompt);
          if (state.state?.resultImage) setResultImage(state.state.resultImage);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params.projectId]);

  const handleAddMoodboardImage = useCallback(
    async (imageUrl: string, description: string) => {
      const id = crypto.randomUUID();
      setMoodboard((prev) => [...prev, { id, url: imageUrl, selected: true }]);

      await fetch(`/api/projects/${params.projectId}/assets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage: 2,
          asset_type: "env_moodboard",
          external_url: imageUrl,
          source: "pinterest",
          metadata: { description },
        }),
      });
    },
    [params.projectId]
  );

  const handleManualUpload = useCallback(
    async (file: File) => {
      const result = await upload(file);
      const id = crypto.randomUUID();
      setMoodboard((prev) => [
        ...prev,
        { id, url: result.publicUrl, selected: true },
      ]);

      await fetch(`/api/projects/${params.projectId}/assets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage: 2,
          asset_type: "env_moodboard",
          storage_path: result.path,
          source: "upload",
        }),
      });
    },
    [params.projectId, upload]
  );

  const handleToggleSelect = useCallback((id: string) => {
    setMoodboard((prev) =>
      prev.map((img) =>
        img.id === id ? { ...img, selected: !img.selected } : img
      )
    );
  }, []);

  const handleRemove = useCallback(
    async (id: string) => {
      setMoodboard((prev) => prev.filter((img) => img.id !== id));
      await fetch(`/api/projects/${params.projectId}/assets/${id}`, {
        method: "DELETE",
      });
    },
    [params.projectId]
  );

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) return;

    setGenerating(true);
    setResultImage(null);

    const selectedImages = moodboard
      .filter((img) => img.selected)
      .map((img) => img.url);

    try {
      const res = await fetch(
        `/api/projects/${params.projectId}/stage/2/generate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: prompt.trim(),
            imagePaths: selectedImages,
          }),
        }
      );

      if (res.ok) {
        const job: Job = await res.json();
        setJobId(job.id);
      }
    } finally {
      setGenerating(false);
    }
  }, [params.projectId, prompt, moodboard]);

  const handleJobComplete = useCallback(
    async (job: Job) => {
      if (job.result_image) {
        setResultImage(job.result_image);
        setJobId(null);

        await fetch(`/api/projects/${params.projectId}/stage/2`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            state: { prompt, resultImage: job.result_image },
          }),
        });
      }
    },
    [params.projectId, prompt]
  );

  const handleRefine = useCallback(
    async (data: {
      prompt: string;
      maskDataUrl: string;
      referenceImagePaths?: string[];
    }) => {
      if (!resultImage) return;

      setRefining(true);

      try {
        const res = await fetch(
          `/api/projects/${params.projectId}/stage/2/mask-refine`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              prompt: data.prompt,
              imagePaths: [
                resultImage,
                ...(data.referenceImagePaths ?? []),
              ],
              maskPath: data.maskDataUrl,
            }),
          }
        );

        if (res.ok) {
          const job: Job = await res.json();
          setRefineJobId(job.id);
        }
      } finally {
        setRefining(false);
      }
    },
    [params.projectId, resultImage]
  );

  const handleRefineComplete = useCallback(
    async (job: Job) => {
      if (job.result_image) {
        setResultImage(job.result_image);
        setRefineJobId(null);

        await fetch(`/api/projects/${params.projectId}/stage/2`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            state: { prompt, resultImage: job.result_image },
          }),
        });
      }
    },
    [params.projectId, prompt]
  );

  const handleApprove = useCallback(async () => {
    setApproving(true);

    try {
      const res = await fetch(
        `/api/projects/${params.projectId}/stage/2/approve`,
        { method: "POST" }
      );

      if (res.ok) {
        router.push(`/dashboard/projects/${params.projectId}/pose`);
      }
    } finally {
      setApproving(false);
    }
  }, [params.projectId, router]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!project) return null;

  const selectedMoodboard = moodboard.filter((img) => img.selected);

  return (
    <StageGate currentStage={project.current_stage} requiredStage={2}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Environment</h1>
          <p className="text-muted-foreground">
            Describe and generate the photographic environment for your scene.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Environment Description</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="env-prompt">
                Describe the environment you want to create
              </Label>
              <Textarea
                id="env-prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="luxury parisian apartment, large windows, golden hour sunlight, warm wooden floor, minimalist furniture..."
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Moodboard</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <MoodboardSearch
              onAddImage={handleAddMoodboardImage}
              projectDescription={prompt}
            />

            <div className="space-y-2">
              <Label>Upload reference images</Label>
              <ImageUpload
                onUpload={handleManualUpload}
                label="Upload moodboard image"
                description={
                  uploading ? "Uploading..." : "Drag and drop or click to browse"
                }
                className="h-32"
              />
            </div>

            <MoodboardGrid
              images={moodboard}
              onToggleSelect={handleToggleSelect}
              onRemove={handleRemove}
            />
          </CardContent>
        </Card>

        <Button
          size="lg"
          onClick={handleGenerate}
          disabled={generating || !prompt.trim() || !!jobId}
          className="w-full"
        >
          {generating || jobId ? (
            <>
              <Loader2 className="animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles />
              Generate Environment
            </>
          )}
        </Button>

        <JobStatus jobId={jobId} onComplete={handleJobComplete} />

        {resultImage && (
          <Card>
            <CardHeader>
              <CardTitle>Generated Environment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="overflow-hidden rounded-lg border">
                <img
                  src={resultImage}
                  alt="Generated environment"
                  className="w-full object-contain"
                />
              </div>

              <RefinementPanel
                imageUrl={resultImage}
                onRefine={handleRefine}
                referenceImages={selectedMoodboard.map((img) => ({
                  id: img.id,
                  url: img.url,
                }))}
                isProcessing={refining || !!refineJobId}
              />

              <JobStatus
                jobId={refineJobId}
                onComplete={handleRefineComplete}
              />

              <Button
                size="lg"
                onClick={handleApprove}
                disabled={approving}
                className="w-full"
              >
                {approving ? (
                  <>
                    <Loader2 className="animate-spin" />
                    Approving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 />
                    Approve & Continue
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </StageGate>
  );
}
