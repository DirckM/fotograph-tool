"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowRight, Loader2, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { JobStatus } from "@/components/job-status";
import { MoodboardBrowser } from "@/components/projects/moodboard-browser";
import { MoodboardStrip } from "@/components/projects/moodboard-strip";
import { StageGate } from "@/components/projects/stage-gate";
import { HelpChat } from "@/components/help-chat";
import { useFileUpload } from "@/lib/hooks";
import type { Project, ProjectAsset, Job } from "@/types";

export default function ModelPage() {
  const params = useParams<{ projectId: string }>();
  const router = useRouter();
  const { upload, uploading } = useFileUpload();

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  const [description, setDescription] = useState("");
  const [moodboardAssets, setMoodboardAssets] = useState<ProjectAsset[]>([]);
  const [selectedMoodboardIds, setSelectedMoodboardIds] = useState<Set<string>>(
    new Set()
  );

  const [notes, setNotes] = useState<Record<string, string>>({});

  const [generateJobId, setGenerateJobId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generatedFace, setGeneratedFace] = useState<ProjectAsset | null>(null);
  const [refinedFace, setRefinedFace] = useState<ProjectAsset | null>(null);

  const [showNoRefsConfirm, setShowNoRefsConfirm] = useState(false);
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);

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
          const moodboard = allAssets.filter((a) => a.asset_type === "face_moodboard");
          setMoodboardAssets(moodboard);
          const loadedNotes: Record<string, string> = {};
          const loadedSelected = new Set<string>();
          for (const a of moodboard) {
            const meta = a.metadata as Record<string, unknown> | null;
            if (typeof meta?.note === "string" && meta.note) loadedNotes[a.id] = meta.note;
            if (meta?.selected === true) loadedSelected.add(a.id);
          }
          setNotes(loadedNotes);
          setSelectedMoodboardIds(loadedSelected);
          const face = allAssets.find((a) => a.asset_type === "refined_face");
          if (face) {
            setRefinedFace(face);
          } else {
            const gen = allAssets.find((a) => a.asset_type === "generated_face");
            if (gen) setGeneratedFace(gen);
          }
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params.projectId]);

  // -- Moodboard handlers --

  const handleAddPinterestImage = useCallback(
    async (imageUrl: string, _description: string) => {
      const res = await fetch(`/api/projects/${params.projectId}/assets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage: 1,
          asset_type: "face_moodboard",
          source: "pinterest",
          external_url: imageUrl,
        }),
      });
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
      const res = await fetch(`/api/projects/${params.projectId}/assets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage: 1,
          asset_type: "face_moodboard",
          source: "upload",
          storage_path: result.publicUrl,
        }),
      });
      if (res.ok) {
        const asset: ProjectAsset = await res.json();
        setMoodboardAssets((prev) => [...prev, asset]);
      }
    },
    [upload, params.projectId]
  );

  const handleToggleMoodboardSelect = useCallback(
    (id: string) => {
      setSelectedMoodboardIds((prev) => {
        const next = new Set(prev);
        const nowSelected = !next.has(id);
        nowSelected ? next.add(id) : next.delete(id);
        fetch(`/api/projects/${params.projectId}/assets/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ metadata: { note: notes[id] ?? "", selected: nowSelected } }),
        });
        return next;
      });
    },
    [params.projectId, notes]
  );

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

  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const handleNoteChange = useCallback(
    (id: string, note: string) => {
      setNotes((prev) => ({ ...prev, [id]: note }));
      clearTimeout(saveTimers.current[id]);
      saveTimers.current[id] = setTimeout(() => {
        fetch(`/api/projects/${params.projectId}/assets/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ metadata: { note, selected: selectedMoodboardIds.has(id) } }),
        });
      }, 600);
    },
    [params.projectId, selectedMoodboardIds]
  );

  // -- Face generation --

  const getSelectedImageUrls = useCallback((): string[] => {
    return moodboardAssets
      .filter((a) => selectedMoodboardIds.has(a.id))
      .map((a) => a.external_url ?? a.storage_path ?? "")
      .filter(Boolean);
  }, [moodboardAssets, selectedMoodboardIds]);

  const getSelectedImageNotes = useCallback((): string => {
    return moodboardAssets
      .filter((a) => selectedMoodboardIds.has(a.id) && notes[a.id])
      .map((a) => `- ${notes[a.id]}`)
      .join("\n");
  }, [moodboardAssets, selectedMoodboardIds, notes]);

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
            referenceNotes: getSelectedImageNotes(),
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
        const res = await fetch(`/api/projects/${params.projectId}/assets`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            stage: 1,
            asset_type: "generated_face",
            source: "gemini",
            storage_path: job.result_image,
          }),
        });
        if (res.ok) {
          const asset: ProjectAsset = await res.json();
          setGeneratedFace(asset);
          setRefinedFace(null);
        }
      }
    },
    [params.projectId]
  );

  // -- Derived --

  const faceGenerated = !!(generatedFace || refinedFace);
  const currentFaceUrl =
    (refinedFace?.storage_path ?? refinedFace?.external_url) ??
    (generatedFace?.storage_path ?? generatedFace?.external_url);

  const moodboardGridImages = moodboardAssets.map((a) => ({
    id: a.id,
    url: a.external_url ?? a.storage_path ?? "",
    selected: selectedMoodboardIds.has(a.id),
    note: notes[a.id] ?? "",
  }));

  if (loading || !project) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <StageGate currentStage={project.current_stage} requiredStage={1}>
      <div className="flex h-full overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl space-y-6 px-6 py-4">
            {/* Title */}
            <div>
              <h2 className="text-lg font-semibold tracking-tight">
                Stage 1: <span className="font-serif italic">Model</span>{" "}
                Generation
              </h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Describe your model, add reference images, and generate a face.
              </p>
            </div>

            {/* Description */}
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

            {/* Moodboard */}
            <MoodboardStrip images={moodboardGridImages} />

            <MoodboardBrowser
              images={moodboardGridImages}
              onAddFromPinterest={handleAddPinterestImage}
              onUpload={handleUploadMoodboardImage}
              onToggleSelect={handleToggleMoodboardSelect}
              onRemove={handleRemoveMoodboardImage}
              onNoteChange={handleNoteChange}
              projectDescription={description || undefined}
              uploading={uploading}
            />

            {/* Selected references with notes */}
            {selectedMoodboardIds.size > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-medium text-muted-foreground">
                  {selectedMoodboardIds.size} reference
                  {selectedMoodboardIds.size !== 1 ? "s" : ""} selected
                </p>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {moodboardAssets
                    .filter((a) => selectedMoodboardIds.has(a.id))
                    .map((a) => {
                      const url = a.external_url ?? a.storage_path ?? "";
                      return (
                        <div key={a.id} className="space-y-2">
                          <div className="relative overflow-hidden rounded-lg border-2 border-blue-500 ring-2 ring-blue-500/20">
                            <img
                              src={url}
                              alt="Selected reference"
                              className="aspect-square w-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => handleToggleMoodboardSelect(a.id)}
                              className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-full border-2 border-blue-500 bg-blue-500 text-white transition-colors hover:bg-blue-600"
                            >
                              <X className="size-3.5" />
                            </button>
                          </div>
                          <input
                            type="text"
                            value={notes[a.id] ?? ""}
                            onChange={(e) =>
                              handleNoteChange(a.id, e.target.value)
                            }
                            placeholder="What do you like? e.g. &quot;the freckles&quot;"
                            className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/30"
                          />
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Generate button */}
            <Button
              onClick={() => {
                if (faceGenerated) {
                  setShowRegenerateConfirm(true);
                } else if (
                  selectedMoodboardIds.size === 0 &&
                  moodboardAssets.length > 0
                ) {
                  setShowNoRefsConfirm(true);
                } else {
                  handleGenerateFace();
                }
              }}
              disabled={generating || !description.trim() || uploading}
              className="w-full py-6 text-base"
            >
              {generating ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5" />
                  {faceGenerated ? "Regenerate Face" : "Generate Face"}
                </>
              )}
            </Button>

            {/* Regenerate confirm */}
            <Dialog
              open={showRegenerateConfirm}
              onOpenChange={setShowRegenerateConfirm}
            >
              <DialogContent showCloseButton={false}>
                <DialogHeader>
                  <DialogTitle>Regenerate the entire face?</DialogTitle>
                  <DialogDescription>
                    This will generate a completely new face from the description
                    and selected references. Your current face, any refinements,
                    and all generated angles will no longer match the new face
                    and will need to be redone.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setShowRegenerateConfirm(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => {
                      setShowRegenerateConfirm(false);
                      if (
                        selectedMoodboardIds.size === 0 &&
                        moodboardAssets.length > 0
                      ) {
                        setShowNoRefsConfirm(true);
                      } else {
                        handleGenerateFace();
                      }
                    }}
                  >
                    Regenerate
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* No refs confirm */}
            <Dialog
              open={showNoRefsConfirm}
              onOpenChange={setShowNoRefsConfirm}
            >
              <DialogContent showCloseButton={false}>
                <DialogHeader>
                  <DialogTitle>Generate without reference images?</DialogTitle>
                  <DialogDescription>
                    You have {moodboardAssets.length} moodboard image
                    {moodboardAssets.length !== 1 ? "s" : ""} but none are
                    selected as reference. The model will be generated from the
                    description only, which may produce less accurate results.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setShowNoRefsConfirm(false)}
                  >
                    Go back and select images
                  </Button>
                  <Button
                    onClick={() => {
                      setShowNoRefsConfirm(false);
                      handleGenerateFace();
                    }}
                  >
                    Generate anyway
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {generateJobId && (
              <JobStatus
                jobId={generateJobId}
                onComplete={handleGenerateComplete}
              />
            )}

            {/* Generated face result */}
            {faceGenerated && currentFaceUrl && (
              <div className="space-y-4">
                <div className="overflow-hidden rounded-lg border border-border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={currentFaceUrl}
                    alt="Generated model face"
                    className="w-full object-contain"
                    style={{ maxHeight: "60vh" }}
                  />
                </div>

                <Button
                  size="lg"
                  onClick={() =>
                    router.push(
                      `/dashboard/projects/${params.projectId}/model/refine`
                    )
                  }
                  className="w-full py-6 text-base"
                >
                  Continue to Refinement & Angles
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            )}
          </div>
        </div>

        <HelpChat context="model-generation" />
      </div>
    </StageGate>
  );
}
