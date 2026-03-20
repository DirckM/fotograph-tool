"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowRight,
  Loader2,
  Sparkles,
  User,
  RotateCw,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ImageUpload } from "@/components/image-upload";
import { JobStatus } from "@/components/job-status";
import { MoodboardSearch } from "@/components/projects/moodboard-search";
import { MoodboardGrid } from "@/components/projects/moodboard-grid";
import { RefinementPanel } from "@/components/projects/refinement-panel";
import { AssetGrid } from "@/components/projects/asset-grid";
import { StageGate } from "@/components/projects/stage-gate";
import { useFileUpload } from "@/lib/hooks";
import type { Project, ProjectAsset, Job } from "@/types";

const ANGLE_SET = [
  { angle: "front", label: "Front" },
  { angle: "front three-quarter left", label: "3/4 Left" },
  { angle: "front three-quarter right", label: "3/4 Right" },
  { angle: "left profile", label: "Profile Left" },
  { angle: "right profile", label: "Profile Right" },
];

export default function ModelPage() {
  const params = useParams<{ projectId: string }>();
  const router = useRouter();
  const { upload, uploading } = useFileUpload();

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  // Section 1: Moodboard
  const [description, setDescription] = useState("");
  const [moodboardAssets, setMoodboardAssets] = useState<ProjectAsset[]>([]);
  const [selectedMoodboardIds, setSelectedMoodboardIds] = useState<Set<string>>(
    new Set()
  );

  // Section 2: Generate face
  const [generateJobId, setGenerateJobId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generatedFace, setGeneratedFace] = useState<ProjectAsset | null>(null);

  // Section 3: Refinement
  const [refineJobId, setRefineJobId] = useState<string | null>(null);
  const [refining, setRefining] = useState(false);
  const [refinedFace, setRefinedFace] = useState<ProjectAsset | null>(null);

  // Section 4: Angles
  const [angleAssets, setAngleAssets] = useState<ProjectAsset[]>([]);
  const [generatingAngles, setGeneratingAngles] = useState(false);
  const [angleJobIds, setAngleJobIds] = useState<string[]>([]);
  const [angleJobsCompleted, setAngleJobsCompleted] = useState(0);

  // Section 5: Approve
  const [approving, setApproving] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [projectRes, assetsRes] = await Promise.all([
          fetch(`/api/projects/${params.projectId}`),
          fetch(`/api/projects/${params.projectId}/assets?stage=1`),
        ]);

        if (projectRes.ok) {
          const proj: Project = await projectRes.json();
          setProject(proj);
          setDescription(proj.description ?? "");
        }

        if (assetsRes.ok) {
          const allAssets: ProjectAsset[] = await assetsRes.json();

          setMoodboardAssets(
            allAssets.filter((a) => a.asset_type === "face_moodboard")
          );

          const face = allAssets.find(
            (a) => a.asset_type === "refined_face"
          );
          if (face) {
            setRefinedFace(face);
          } else {
            const gen = allAssets.find(
              (a) => a.asset_type === "generated_face"
            );
            if (gen) setGeneratedFace(gen);
          }

          setAngleAssets(
            allAssets.filter((a) => a.asset_type === "face_angle")
          );
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params.projectId]);

  // -- Section 1 handlers --

  const handleAddPinterestImage = useCallback(
    async (imageUrl: string, _description: string) => {
      const res = await fetch(
        `/api/projects/${params.projectId}/assets`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            stage: 1,
            asset_type: "face_moodboard",
            source: "pinterest",
            external_url: imageUrl,
          }),
        }
      );

      if (res.ok) {
        const asset: ProjectAsset = await res.json();
        setMoodboardAssets((prev) => [...prev, asset]);
      }
    },
    [params.projectId]
  );

  const handleUploadMoodboardImage = useCallback(
    async (file: File) => {
      const result = await upload(file);

      const res = await fetch(
        `/api/projects/${params.projectId}/assets`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            stage: 1,
            asset_type: "face_moodboard",
            source: "upload",
            storage_path: result.publicUrl,
          }),
        }
      );

      if (res.ok) {
        const asset: ProjectAsset = await res.json();
        setMoodboardAssets((prev) => [...prev, asset]);
      }
    },
    [upload, params.projectId]
  );

  const handleToggleMoodboardSelect = useCallback((id: string) => {
    setSelectedMoodboardIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleRemoveMoodboardImage = useCallback(
    async (id: string) => {
      const res = await fetch(
        `/api/projects/${params.projectId}/assets/${id}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        setMoodboardAssets((prev) => prev.filter((a) => a.id !== id));
        setSelectedMoodboardIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [params.projectId]
  );

  // -- Section 2 handlers --

  const getSelectedImageUrls = useCallback((): string[] => {
    return moodboardAssets
      .filter((a) => selectedMoodboardIds.has(a.id))
      .map((a) => a.external_url ?? a.storage_path ?? "")
      .filter(Boolean);
  }, [moodboardAssets, selectedMoodboardIds]);

  const handleGenerateFace = useCallback(async () => {
    setGenerating(true);
    try {
      const res = await fetch(
        `/api/projects/${params.projectId}/stage/1/generate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: description,
            imagePaths: getSelectedImageUrls(),
          }),
        }
      );
      if (res.ok) {
        const job: Job = await res.json();
        setGenerateJobId(job.id);
      } else {
        setGenerating(false);
      }
    } catch {
      setGenerating(false);
    }
  }, [params.projectId, description, getSelectedImageUrls]);

  const handleGenerateComplete = useCallback(
    async (job: Job) => {
      setGenerating(false);
      setGenerateJobId(null);

      if (job.result_image) {
        const res = await fetch(
          `/api/projects/${params.projectId}/assets`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              stage: 1,
              asset_type: "generated_face",
              source: "gemini",
              storage_path: job.result_image,
            }),
          }
        );
        if (res.ok) {
          const asset: ProjectAsset = await res.json();
          setGeneratedFace(asset);
        }
      }
    },
    [params.projectId]
  );

  // -- Section 3 handlers --

  const currentFaceUrl =
    (refinedFace?.storage_path ?? refinedFace?.external_url) ??
    (generatedFace?.storage_path ?? generatedFace?.external_url);

  const handleRefine = useCallback(
    async (data: {
      prompt: string;
      maskDataUrl: string;
      referenceImagePaths?: string[];
    }) => {
      if (!currentFaceUrl) return;
      setRefining(true);
      try {
        const res = await fetch(
          `/api/projects/${params.projectId}/stage/1/mask-refine`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              prompt: data.prompt,
              maskPath: data.maskDataUrl,
              imagePaths: [
                currentFaceUrl,
                ...(data.referenceImagePaths ?? []),
              ],
            }),
          }
        );
        if (res.ok) {
          const job: Job = await res.json();
          setRefineJobId(job.id);
        } else {
          setRefining(false);
        }
      } catch {
        setRefining(false);
      }
    },
    [params.projectId, currentFaceUrl]
  );

  const handleRefineComplete = useCallback(
    async (job: Job) => {
      setRefining(false);
      setRefineJobId(null);

      if (job.result_image) {
        const res = await fetch(
          `/api/projects/${params.projectId}/assets`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              stage: 1,
              asset_type: "refined_face",
              source: "gemini",
              storage_path: job.result_image,
            }),
          }
        );
        if (res.ok) {
          const asset: ProjectAsset = await res.json();
          setRefinedFace(asset);
        }
      }
    },
    [params.projectId]
  );

  // -- Section 4 handlers --

  const finalFaceUrl = currentFaceUrl;
  const hasFinalFace = !!(generatedFace || refinedFace);

  const handleGenerateAngles = useCallback(async () => {
    if (!finalFaceUrl) return;
    setGeneratingAngles(true);
    setAngleJobsCompleted(0);

    const jobIds: string[] = [];

    for (const { angle } of ANGLE_SET) {
      try {
        const res = await fetch("/api/generate-perspective", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imagePath: finalFaceUrl,
            angle,
          }),
        });
        if (res.ok) {
          const job: Job = await res.json();
          jobIds.push(job.id);
        }
      } catch {
        // continue with remaining angles
      }
    }

    setAngleJobIds(jobIds);
  }, [finalFaceUrl]);

  const handleAngleJobComplete = useCallback(
    async (job: Job) => {
      setAngleJobsCompleted((prev) => {
        const next = prev + 1;
        if (next >= angleJobIds.length) {
          setGeneratingAngles(false);
        }
        return next;
      });

      if (job.result_image) {
        const res = await fetch(
          `/api/projects/${params.projectId}/assets`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              stage: 1,
              asset_type: "face_angle",
              source: "gemini",
              storage_path: job.result_image,
            }),
          }
        );
        if (res.ok) {
          const asset: ProjectAsset = await res.json();
          setAngleAssets((prev) => [...prev, asset]);
        }
      }
    },
    [params.projectId, angleJobIds.length]
  );

  // -- Section 5 handlers --

  const handleApprove = useCallback(async () => {
    setApproving(true);
    try {
      await fetch(
        `/api/projects/${params.projectId}/stage/1/approve`,
        { method: "POST" }
      );
      router.push(
        `/dashboard/projects/${params.projectId}/environment`
      );
    } finally {
      setApproving(false);
    }
  }, [params.projectId, router]);

  if (loading || !project) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const moodboardGridImages = moodboardAssets.map((a) => ({
    id: a.id,
    url: a.external_url ?? a.storage_path ?? "",
    selected: selectedMoodboardIds.has(a.id),
  }));

  const moodboardReferenceImages = moodboardAssets.map((a) => ({
    id: a.id,
    url: a.external_url ?? a.storage_path ?? "",
  }));

  return (
    <StageGate currentStage={project.current_stage} requiredStage={1}>
      <div className="space-y-8">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            Stage 1: Model Generation
          </h2>
          <p className="text-sm text-muted-foreground">
            Create a virtual model face, refine it, and generate multiple
            angles for consistency.
          </p>
        </div>

        {/* Section 1: Face Moodboard */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-4 w-4" />
              Face Moodboard
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="model-description">Model Description</Label>
              <Textarea
                id="model-description"
                placeholder="Describe the model you want to generate (e.g., 'Young woman, mid-20s, high cheekbones, warm skin tone, dark brown wavy hair')..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="resize-y"
              />
            </div>

            <MoodboardSearch
              onAddImage={handleAddPinterestImage}
              projectDescription={description || undefined}
            />

            <div className="space-y-2">
              <Label>Upload Reference Images</Label>
              <ImageUpload
                onUpload={handleUploadMoodboardImage}
                label="Upload face reference"
                description="Add your own reference photos"
                className="min-h-28"
              />
            </div>

            <MoodboardGrid
              images={moodboardGridImages}
              onToggleSelect={handleToggleMoodboardSelect}
              onRemove={handleRemoveMoodboardImage}
            />

            {selectedMoodboardIds.size > 0 && (
              <p className="text-sm text-muted-foreground">
                {selectedMoodboardIds.size} image
                {selectedMoodboardIds.size !== 1 ? "s" : ""} selected as
                reference for generation
              </p>
            )}
          </CardContent>
        </Card>

        {/* Section 2: Generate Face */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4" />
              Generate Face
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              size="lg"
              onClick={handleGenerateFace}
              disabled={
                generating ||
                !description.trim() ||
                uploading
              }
            >
              {generating ? (
                <>
                  <Loader2 className="animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles />
                  Generate Face
                </>
              )}
            </Button>

            {generateJobId && (
              <JobStatus
                jobId={generateJobId}
                onComplete={handleGenerateComplete}
              />
            )}

            {generatedFace && !refinedFace && (
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">
                  Generated Face
                </Label>
                <div className="max-w-sm overflow-hidden rounded-lg border">
                  <img
                    src={
                      generatedFace.storage_path ??
                      generatedFace.external_url ??
                      ""
                    }
                    alt="Generated face"
                    className="w-full object-cover"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Section 3: Refinement */}
        {(generatedFace || refinedFace) && currentFaceUrl && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <RotateCw className="h-4 w-4" />
                Refine Face
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Paint a mask over the areas you want to change and describe
                the desired modification.
              </p>

              <RefinementPanel
                imageUrl={currentFaceUrl}
                onRefine={handleRefine}
                referenceImages={moodboardReferenceImages}
                isProcessing={refining}
              />

              {refineJobId && (
                <JobStatus
                  jobId={refineJobId}
                  onComplete={handleRefineComplete}
                />
              )}

              {refinedFace && (
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">
                    Refined Face
                  </Label>
                  <div className="max-w-sm overflow-hidden rounded-lg border">
                    <img
                      src={
                        refinedFace.storage_path ??
                        refinedFace.external_url ??
                        ""
                      }
                      alt="Refined face"
                      className="w-full object-cover"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Section 4: Generate Angles */}
        {hasFinalFace && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <RotateCw className="h-4 w-4" />
                Generate Angles
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Generate 5 perspective angles of the model face for
                consistency across poses.
              </p>

              <Button
                size="lg"
                onClick={handleGenerateAngles}
                disabled={generatingAngles || !finalFaceUrl}
              >
                {generatingAngles ? (
                  <>
                    <Loader2 className="animate-spin" />
                    Generating Angles ({angleJobsCompleted}/
                    {angleJobIds.length})...
                  </>
                ) : (
                  <>
                    <RotateCw />
                    Generate 5 Angles
                  </>
                )}
              </Button>

              {angleJobIds.map((jobId) => (
                <JobStatus
                  key={jobId}
                  jobId={jobId}
                  onComplete={handleAngleJobComplete}
                />
              ))}

              {angleAssets.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">
                    Generated Angles ({angleAssets.length}/{ANGLE_SET.length})
                  </Label>
                  <AssetGrid assets={angleAssets} columns={5} />
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Section 5: Approve */}
        {hasFinalFace && angleAssets.length > 0 && (
          <div className="flex justify-end">
            <Button
              size="lg"
              onClick={handleApprove}
              disabled={approving}
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
                  <ArrowRight className="ml-1 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </StageGate>
  );
}
