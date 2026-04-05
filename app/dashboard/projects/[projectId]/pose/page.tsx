"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Check, Loader2, Sparkles, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { JobStatus } from "@/components/job-status";
import { MoodboardBrowser } from "@/components/projects/moodboard-browser";
import { MaskCanvas } from "@/components/projects/mask-canvas";
import { RefinementControls } from "@/components/projects/refinement-panel";
import { StageGate } from "@/components/projects/stage-gate";
import { StageLayout } from "@/components/projects/stage-layout";
import { useHelpChat } from "@/components/projects/help-chat-context";
import { cn } from "@/lib/utils";
import { DisabledTooltip } from "@/components/ui/disabled-tooltip";
import { useFileUpload } from "@/lib/hooks";
import type { Project, ProjectAsset, Job } from "@/types";

interface MoodboardImage {
  id: string;
  url: string;
  selected: boolean;
  note?: string;
}

const POSE_EXAMPLES = [
  {
    label: "Casual standing",
    text: "Standing casually, one hand in pocket, weight shifted to one leg, relaxed shoulders, looking slightly off-camera",
  },
  {
    label: "Seated editorial",
    text: "Seated on a low stool, legs crossed, one hand resting on knee, upright posture, direct eye contact with camera",
  },
  {
    label: "Walking motion",
    text: "Mid-stride walking pose, arms in natural swing, slight forward lean, dynamic movement, candid feel",
  },
  {
    label: "Leaning pose",
    text: "Leaning against a wall with one shoulder, arms folded, ankles crossed, confident and relaxed body language",
  },
  {
    label: "High fashion",
    text: "Strong angular pose, one hip pushed out, hand on waist, elongated neck, sharp deliberate posture",
  },
  {
    label: "Crouching / low",
    text: "Low crouching position, one knee up, forearms resting on knees, looking up at camera, street-style energy",
  },
];

export default function PoseStagePage() {
  const params = useParams<{ projectId: string }>();
  const router = useRouter();
  const { upload, uploading } = useFileUpload();
  const { setChatState, clearChatState } = useHelpChat();

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [prompt, setPrompt] = useState("");
  const [showExamples, setShowExamples] = useState(false);
  const [moodboard, setMoodboard] = useState<MoodboardImage[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [generating, setGenerating] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [approving, setApproving] = useState(false);

  // Note refinement
  const [refiningNotes, setRefiningNotes] = useState(false);
  const [refinedNotes, setRefinedNotes] = useState<{ original: string; refined: string; question?: string; options?: string[] }[]>([]);
  const [editableRefinedNotes, setEditableRefinedNotes] = useState<string[]>([]);
  const [showNoteReview, setShowNoteReview] = useState(false);
  const [clarificationContext, setClarificationContext] = useState<{
    description: string;
    notes: { index: number; original: string; refined: string; question: string; options?: string[]; imageUrl?: string }[];
    availableImages?: { id: string; url: string }[];
  } | undefined>(undefined);

  // Mask refinement
  const [refineJobId, setRefineJobId] = useState<string | null>(null);
  const [refining, setRefining] = useState(false);
  const [maskDataUrl, setMaskDataUrl] = useState<string | null>(null);
  const [refineRefs, setRefineRefs] = useState<{ id: string; url: string; selected: boolean }[]>([]);
  const [refineNotes, setRefineNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    async function load() {
      try {
        const [projectRes, assetsRes, stageRes] = await Promise.all([
          fetch(`/api/projects/${params.projectId}`),
          fetch(`/api/projects/${params.projectId}/assets?stage=3`),
          fetch(`/api/projects/${params.projectId}/stage/3`),
        ]);

        if (projectRes.ok) {
          const proj: Project = await projectRes.json();
          setProject(proj);
        }

        if (assetsRes.ok) {
          const assets: ProjectAsset[] = await assetsRes.json();
          const moodboardAssets = assets
            .filter((a) => a.asset_type === "pose_moodboard")
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
          stage: 3,
          asset_type: "pose_moodboard",
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

      const isExternal = result.publicUrl.startsWith("http") && !result.publicUrl.includes("supabase");
      await fetch(`/api/projects/${params.projectId}/assets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage: 3,
          asset_type: "pose_moodboard",
          source: "upload",
          ...(isExternal ? { external_url: result.publicUrl } : { storage_path: result.publicUrl }),
        }),
      });
    },
    [params.projectId, upload]
  );

  const handleAddFromLibrary = useCallback(
    async (url: string) => {
      const id = crypto.randomUUID();
      setMoodboard((prev) => [...prev, { id, url, selected: true }]);

      const isExternal = url.startsWith("http") && !url.includes("supabase");
      await fetch(`/api/projects/${params.projectId}/assets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage: 3,
          asset_type: "pose_moodboard",
          source: "library",
          ...(isExternal ? { external_url: url } : { storage_path: url }),
        }),
      });
    },
    [params.projectId]
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

  const handleNoteChange = useCallback((id: string, note: string) => {
    setNotes((prev) => ({ ...prev, [id]: note }));
  }, []);

  // -- Generation with note refinement --

  const executeGenerate = useCallback(async (finalNotes?: string, overridePrompt?: string, skip?: boolean) => {
    setGenerating(true);
    setResultImage(null);

    const selectedUrls = moodboard
      .filter((img) => img.selected)
      .map((img) => img.url);

    try {
      const res = await fetch(
        `/api/projects/${params.projectId}/stage/3/generate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: overridePrompt || prompt.trim(),
            imagePaths: selectedUrls,
            referenceNotes: finalNotes || undefined,
            skipCompletenessCheck: skip ?? false,
            enhancedPrompt: overridePrompt || undefined,
          }),
        }
      );

      if (res.ok) {
        const data = await res.json();
        if (data.needsClarification && data.clarificationType === "completeness-check") {
          setChatState({
            completenessCheck: {
              stage: data.stage,
              originalPrompt: data.originalPrompt,
              questions: data.questions,
              isMaskRefinement: false,
            },
            onEnhancedPromptConfirm: (enhancedPrompt: string) => {
              clearChatState();
              executeGenerate(finalNotes, enhancedPrompt, true);
            },
          });
          return;
        }
        setJobId(data.id);
      }
    } finally {
      setGenerating(false);
    }
  }, [params.projectId, prompt, moodboard, setChatState, clearChatState]);

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) return;

    const selectedImages = moodboard.filter((img) => img.selected);
    const hasNotes = selectedImages.some((img) => notes[img.id]);

    if (!hasNotes) {
      executeGenerate();
      return;
    }

    // Refine notes first
    setRefiningNotes(true);
    try {
      const imageNotes = selectedImages.map((img) => ({
        url: img.url,
        note: notes[img.id] ?? "",
      }));

      const res = await fetch(
        `/api/projects/${params.projectId}/stage/3/generate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: prompt.trim(),
            imagePaths: selectedImages.map((img) => img.url),
            imageNotes,
          }),
        }
      );

      if (res.ok) {
        const data = await res.json();
        if (data.needsConfirmation) {
          const rNotes = data.refinedNotes ?? [];
          setRefinedNotes(rNotes);
          setEditableRefinedNotes(rNotes.map((n: { refined: string }) => n.refined));
          setShowNoteReview(true);

          const questionsForChat = rNotes
            .map((n: { original: string; refined: string; question?: string; options?: string[] }, i: number) => ({
              index: i,
              original: n.original,
              refined: n.refined,
              question: n.question,
              options: n.options,
              imageUrl: selectedImages[i]?.url,
            }))
            .filter((n: { question?: string }) => n.question);

          const unselected = moodboard
            .filter((m) => !m.selected)
            .map((m) => ({ id: m.id, url: m.url }))
            .filter((m) => m.url);

          setClarificationContext(
            questionsForChat.length > 0
              ? { description: prompt.trim(), notes: questionsForChat, availableImages: unselected.length > 0 ? unselected : undefined }
              : undefined
          );
        } else {
          executeGenerate();
        }
      } else {
        // Fallback: raw notes
        const rawNotes = selectedImages
          .filter((img) => notes[img.id])
          .map((img) => `- ${notes[img.id]}`)
          .join("\n");
        executeGenerate(rawNotes);
      }
    } catch {
      const selectedImages2 = moodboard.filter((img) => img.selected);
      const rawNotes = selectedImages2
        .filter((img) => notes[img.id])
        .map((img) => `- ${notes[img.id]}`)
        .join("\n");
      executeGenerate(rawNotes);
    } finally {
      setRefiningNotes(false);
    }
  }, [params.projectId, prompt, moodboard, notes, executeGenerate]);

  const handleConfirmRefinedNotes = useCallback(() => {
    setShowNoteReview(false);
    setClarificationContext(undefined);
    const finalNotes = editableRefinedNotes.filter(Boolean).map((n) => `- ${n}`).join("\n");
    executeGenerate(finalNotes);
  }, [editableRefinedNotes, executeGenerate]);

  const handleNoteSuggestions = useCallback(
    (updates: { index: number; refined: string }[]) => {
      setEditableRefinedNotes((prev) => {
        const next = [...prev];
        for (const u of updates) {
          if (u.index >= 0 && u.index < next.length) next[u.index] = u.refined;
        }
        return next;
      });
    },
    []
  );

  const handleAlternativeSelected = useCallback(
    (alt: { imageId: string; imageUrl: string; note: string }) => {
      setMoodboard((prev) =>
        prev.map((img) => img.id === alt.imageId ? { ...img, selected: true } : img)
      );
      setNotes((prev) => ({ ...prev, [alt.imageId]: alt.note }));
    },
    []
  );

  const handleJobComplete = useCallback(
    async (job: Job) => {
      if (job.result_image) {
        setResultImage(job.result_image);
        setJobId(null);

        // Seed refinement references from the moodboard
        const refs = moodboard
          .filter((img) => img.selected && img.url)
          .map((img) => ({ id: img.id, url: img.url, selected: true }));
        setRefineRefs(refs);

        await fetch(`/api/projects/${params.projectId}/stage/3`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            state: { prompt, resultImage: job.result_image },
          }),
        });
      }
    },
    [params.projectId, prompt, moodboard]
  );

  // -- Mask refinement --

  const executeRefine = useCallback(
    async (data: { prompt: string; maskDataUrl: string; referenceImagePaths?: string[] }, overridePrompt?: string, skip?: boolean) => {
      if (!resultImage) return;

      setRefining(true);
      try {
        const imagePaths = [resultImage, ...(data.referenceImagePaths ?? [])];

        const selectedWithNotes = refineRefs
          .filter((r) => r.selected && refineNotes[r.id])
          .map((r) => refineNotes[r.id]);
        const basePrompt = overridePrompt || data.prompt;
        const fullPrompt = selectedWithNotes.length > 0
          ? `${basePrompt}\n\nReference image notes:\n${selectedWithNotes.map((n) => `- ${n}`).join("\n")}`
          : basePrompt;

        const res = await fetch(
          `/api/projects/${params.projectId}/stage/3/mask-refine`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              prompt: fullPrompt,
              maskPath: data.maskDataUrl,
              imagePaths,
              skipCompletenessCheck: skip ?? false,
              enhancedPrompt: overridePrompt || undefined,
            }),
          }
        );
        if (res.ok) {
          const result = await res.json();
          if (result.needsClarification && result.clarificationType === "completeness-check") {
            setRefining(false);
            setChatState({
              completenessCheck: {
                stage: result.stage,
                originalPrompt: result.originalPrompt,
                questions: result.questions,
                isMaskRefinement: true,
              },
              onEnhancedPromptConfirm: (enhancedPrompt: string) => {
                clearChatState();
                executeRefine(data, enhancedPrompt, true);
              },
            });
            return;
          }
          setRefineJobId(result.id);
        } else {
          setRefining(false);
        }
      } catch {
        setRefining(false);
      }
    },
    [params.projectId, resultImage, refineRefs, refineNotes, setChatState, clearChatState]
  );

  const handleRefine = useCallback(
    (data: { prompt: string; maskDataUrl: string; referenceImagePaths?: string[] }) => {
      executeRefine(data);
    },
    [executeRefine]
  );

  const handleRefineAddPinterest = useCallback(
    (imageUrl: string) => {
      setRefineRefs((prev) => [
        ...prev,
        { id: crypto.randomUUID(), url: imageUrl, selected: true },
      ]);
    },
    []
  );

  const handleRefineAddLibrary = useCallback(
    (url: string) => {
      setRefineRefs((prev) => [
        ...prev,
        { id: crypto.randomUUID(), url, selected: true },
      ]);
    },
    []
  );

  const handleRefineUpload = useCallback(
    async (file: File) => {
      const result = await upload(file);
      setRefineRefs((prev) => [
        ...prev,
        { id: crypto.randomUUID(), url: result.publicUrl, selected: true },
      ]);
    },
    [upload]
  );

  const handleRefineToggle = useCallback((id: string) => {
    setRefineRefs((prev) =>
      prev.map((img) =>
        img.id === id ? { ...img, selected: !img.selected } : img
      )
    );
  }, []);

  const handleRefineRemove = useCallback((id: string) => {
    setRefineRefs((prev) => prev.filter((img) => img.id !== id));
  }, []);

  const handleRefineNoteChange = useCallback((id: string, note: string) => {
    setRefineNotes((prev) => ({ ...prev, [id]: note }));
  }, []);

  const handleRefineComplete = useCallback(
    async (job: Job) => {
      setRefining(false);
      setRefineJobId(null);
      if (job.result_image) {
        setResultImage(job.result_image);
        await fetch(`/api/projects/${params.projectId}/stage/3`, {
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
        `/api/projects/${params.projectId}/stage/3/approve`,
        { method: "POST" }
      );

      if (res.ok) {
        router.push(`/dashboard/projects/${params.projectId}/garment`);
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

  const hasResult = !!resultImage;

  return (
    <StageGate currentStage={project.current_stage} requiredStage={3}>
      <StageLayout
        title={
          <>
            Stage 3: <span className="font-serif italic">Pose</span> Generation
          </>
        }
        description="Define the body posture for your model. Add reference images and describe the pose."
        guide={[
          "Describe the body position in detail - how the model is standing/sitting, arm and leg positions, weight distribution, overall energy.",
          "Click 'Browse References' to add pose reference photos. The AI uses these to understand the body language and proportions you want.",
          "Add notes per reference to call out specifics (e.g. 'match the arm position' or 'use this leg stance but more relaxed').",
          "Click 'Generate' to create the pose. After generating, use the mask tool to paint and refine specific body parts.",
        ]}
        guideTip="Reference images are used for body positioning only - they don't affect the face or clothing. The more angles you provide as references, the better the AI understands the 3D pose."
        contentKey={hasResult ? "result" : "setup"}
        aside={
          hasResult ? (
            <div className="flex h-full flex-col">
              <div className="flex flex-col gap-4">
                <RefinementControls
                  onRefine={handleRefine}
                  referenceImages={refineRefs.filter((r) => r.selected)}
                  isProcessing={refining}
                  maskDataUrl={maskDataUrl}
                />

                <MoodboardBrowser
                  images={refineRefs}
                  onAddFromPinterest={handleRefineAddPinterest}
                  onAddFromLibrary={handleRefineAddLibrary}
                  onUpload={handleRefineUpload}
                  onToggleSelect={handleRefineToggle}
                  onRemove={handleRefineRemove}
                  onNoteChange={handleRefineNoteChange}
                  projectDescription={prompt}
                  uploading={uploading}
                  libraryCategory="pose"
                />

                {refineJobId && (
                  <JobStatus jobId={refineJobId} onComplete={handleRefineComplete} />
                )}
              </div>

              <div className="mt-auto space-y-2 border-t border-border/50 pt-4">
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
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setResultImage(null)}
                  className="w-full text-muted-foreground"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Regenerate from scratch
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="pose-prompt">Pose Description</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-muted-foreground"
                    onClick={() => setShowExamples((v) => !v)}
                  >
                    {showExamples ? "Hide examples" : "Examples"}
                  </Button>
                </div>
                <Textarea
                  id="pose-prompt"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe the pose, body language, positioning..."
                  rows={4}
                />
                {showExamples && (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {POSE_EXAMPLES.map((ex) => (
                      <button
                        key={ex.label}
                        type="button"
                        className="rounded-lg border border-border px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:bg-muted/60 hover:text-foreground"
                        onClick={() => {
                          setPrompt(ex.text);
                          setShowExamples(false);
                        }}
                      >
                        <span className="font-medium text-foreground">{ex.label}</span>
                        <br />
                        {ex.text}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Reference images with notes */}
              {moodboard.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>
                      Reference Images
                      {moodboard.filter((m) => m.selected).length > 0 && (
                        <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                          {moodboard.filter((m) => m.selected).length} selected
                        </span>
                      )}
                    </Label>
                    <MoodboardBrowser
                      images={moodboard}
                      onAddFromPinterest={handleAddMoodboardImage}
                      onAddFromLibrary={handleAddFromLibrary}
                      onUpload={handleManualUpload}
                      onToggleSelect={handleToggleSelect}
                      onRemove={handleRemove}
                      onNoteChange={handleNoteChange}
                      projectDescription={prompt}
                      uploading={uploading}
                      libraryCategory="pose"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {moodboard.map((img) => (
                      <div key={img.id} className="space-y-2">
                        <button
                          type="button"
                          onClick={() => handleToggleSelect(img.id)}
                          className={cn(
                            "relative w-full overflow-hidden rounded-lg border-2 transition-colors",
                            img.selected
                              ? "border-blue-500 ring-2 ring-blue-500/20"
                              : "border-border hover:border-muted-foreground/40"
                          )}
                        >
                          <img
                            src={img.url}
                            alt="Reference"
                            className="aspect-square w-full object-cover"
                          />
                          <div
                            className={cn(
                              "absolute left-2 top-2 flex size-6 items-center justify-center rounded-full border-2 transition-colors",
                              img.selected
                                ? "border-blue-500 bg-blue-500 text-white"
                                : "border-white/70 bg-black/30 text-transparent"
                            )}
                          >
                            <Check className="size-3.5" />
                          </div>
                        </button>
                        {img.selected && (
                          <input
                            type="text"
                            value={notes[img.id] ?? ""}
                            onChange={(e) => handleNoteChange(img.id, e.target.value)}
                            placeholder="e.g. &quot;this arm position&quot;"
                            className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/30"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {moodboard.length === 0 && (
                <MoodboardBrowser
                  images={moodboard}
                  onAddFromPinterest={handleAddMoodboardImage}
                  onAddFromLibrary={handleAddFromLibrary}
                  onUpload={handleManualUpload}
                  onToggleSelect={handleToggleSelect}
                  onRemove={handleRemove}
                  onNoteChange={handleNoteChange}
                  projectDescription={prompt}
                  uploading={uploading}
                  libraryCategory="pose"
                />
              )}

              {/* Generate button */}
              <DisabledTooltip
                message={
                  !generating && !refiningNotes && !showNoteReview && !jobId && !prompt.trim()
                    ? "Enter a pose description"
                    : undefined
                }
              >
                <Button
                  onClick={handleGenerate}
                  disabled={generating || refiningNotes || showNoteReview || !prompt.trim() || !!jobId}
                  className="w-full py-6 text-base"
                  data-tour="pose-generate"
                >
                  {refiningNotes ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Analyzing references...
                    </>
                  ) : generating || jobId ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5" />
                      Generate Pose
                    </>
                  )}
                </Button>
              </DisabledTooltip>

              {/* Note review panel */}
              {showNoteReview && refinedNotes.length > 0 && (
                <div className="rounded-lg border border-border bg-card/50 p-4 space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold">Review refined reference notes</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      We analyzed your reference images. Review and edit before generating.
                    </p>
                  </div>
                  <div className="space-y-3">
                    {refinedNotes.map((note, i) => (
                      <div key={i} className="space-y-1.5">
                        <p className="text-xs text-muted-foreground">
                          Your note: <span className="italic">&quot;{note.original}&quot;</span>
                        </p>
                        <Textarea
                          value={editableRefinedNotes[i] ?? ""}
                          onChange={(e) => {
                            const updated = [...editableRefinedNotes];
                            updated[i] = e.target.value;
                            setEditableRefinedNotes(updated);
                          }}
                          rows={2}
                          className="text-sm"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowNoteReview(false);
                        setClarificationContext(undefined);
                        clearChatState();
                      }}
                    >
                      Cancel
                    </Button>
                    <Button size="sm" onClick={handleConfirmRefinedNotes}>
                      Confirm & Generate
                    </Button>
                  </div>
                </div>
              )}

              {jobId && <JobStatus jobId={jobId} onComplete={handleJobComplete} />}
            </div>
          )
        }
      >
        {hasResult ? (
          <MaskCanvas
            imageUrl={resultImage}
            onExportMask={setMaskDataUrl}
          />
        ) : (
          <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-border/60">
            <p className="text-sm text-muted-foreground">
              Pose preview will appear here
            </p>
          </div>
        )}
      </StageLayout>
    </StageGate>
  );
}
