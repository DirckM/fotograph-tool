"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowRight, Check, Loader2, Sparkles, X } from "lucide-react";
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
import { StageGate } from "@/components/projects/stage-gate";
import { StageGuide } from "@/components/projects/stage-guide";
import { useHelpChat } from "@/components/projects/help-chat-context";
import { cn } from "@/lib/utils";
import { DisabledTooltip } from "@/components/ui/disabled-tooltip";
import { useFileUpload } from "@/lib/hooks";
import type { Project, ProjectAsset, Job } from "@/types";

const MODEL_EXAMPLES = [
  {
    label: "Editorial female",
    text: "Young woman, mid-20s, high cheekbones, warm skin tone, dark brown wavy hair, soft freckles, green eyes",
  },
  {
    label: "Editorial male",
    text: "Man, early 30s, sharp jawline, light stubble, short dark hair, brown eyes, olive skin tone",
  },
  {
    label: "Commercial female",
    text: "Woman, late 20s, friendly open face, blonde straight hair, blue eyes, fair skin, natural look",
  },
  {
    label: "Commercial male",
    text: "Man, mid-20s, clean-shaven, curly auburn hair, hazel eyes, freckled, approachable expression",
  },
  {
    label: "High fashion",
    text: "Androgynous model, early 20s, striking angular features, very short platinum buzz cut, pale grey eyes, porcelain skin",
  },
  {
    label: "Mature model",
    text: "Woman, mid-50s, silver grey hair in a bob, warm brown eyes, laugh lines, elegant bone structure, medium skin tone",
  },
];

export default function ModelPage() {
  const params = useParams<{ projectId: string }>();
  const router = useRouter();
  const { upload, uploading } = useFileUpload();
  const { setChatState, clearChatState } = useHelpChat();

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  const [description, setDescription] = useState("");
  const [showExamples, setShowExamples] = useState(false);
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
  const [referenceWarnings, setReferenceWarnings] = useState<string[]>([]);
  const [chatWarningMessage, setChatWarningMessage] = useState<string>();
  const [refinedNotes, setRefinedNotes] = useState<{ original: string; refined: string; question?: string }[]>([]);
  const [editableRefinedNotes, setEditableRefinedNotes] = useState<string[]>([]);
  const [showRefinedReview, setShowRefinedReview] = useState(false);
  const [refining, setRefining] = useState(false);
  const [clarificationContext, setClarificationContext] = useState<{
    description: string;
    notes: { index: number; original: string; refined: string; question: string; options?: string[]; imageUrl?: string }[];
    availableImages?: { id: string; url: string }[];
  } | undefined>(undefined);

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
          const face = allAssets.findLast((a) => a.asset_type === "refined_face");
          if (face) {
            setRefinedFace(face);
          } else {
            const gen = allAssets.findLast((a) => a.asset_type === "generated_face");
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

  const handleAddFromLibrary = useCallback(
    async (url: string) => {
      const isExternal = url.startsWith("http") && !url.includes("supabase");
      const res = await fetch(`/api/projects/${params.projectId}/assets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage: 1,
          asset_type: "face_moodboard",
          source: "upload",
          ...(isExternal ? { external_url: url } : { storage_path: url }),
        }),
      });
      if (res.ok) {
        const asset: ProjectAsset = await res.json();
        setMoodboardAssets((prev) => [...prev, asset]);
      }
    },
    [params.projectId]
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

  // -- Chat note suggestions --

  const handleNoteSuggestions = useCallback(
    (updates: { index: number; refined: string }[]) => {
      setEditableRefinedNotes((prev) => {
        const next = [...prev];
        for (const u of updates) {
          if (u.index >= 0 && u.index < next.length) {
            next[u.index] = u.refined;
          }
        }
        return next;
      });
    },
    []
  );

  const handleAlternativeSelected = useCallback(
    (alt: { imageId: string; imageUrl: string; note: string }) => {
      // Select the alternative image and add its note
      setSelectedMoodboardIds((prev) => {
        const next = new Set(prev);
        next.add(alt.imageId);
        fetch(`/api/projects/${params.projectId}/assets/${alt.imageId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ metadata: { note: alt.note, selected: true } }),
        });
        return next;
      });
      setNotes((prev) => ({ ...prev, [alt.imageId]: alt.note }));
    },
    [params.projectId]
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

  const getSelectedImageNotesPerImage = useCallback((): { url: string; note: string }[] => {
    return moodboardAssets
      .filter((a) => selectedMoodboardIds.has(a.id))
      .map((a) => ({
        url: a.external_url ?? a.storage_path ?? "",
        note: notes[a.id] ?? "",
      }))
      .filter((item) => item.url);
  }, [moodboardAssets, selectedMoodboardIds, notes]);

  const handleGenerateFace = useCallback(async (overridePrompt?: string, skip?: boolean) => {
    setRefining(true);
    setReferenceWarnings([]);
    try {
      const res = await fetch(
        `/api/projects/${params.projectId}/stage/1/generate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: overridePrompt || description,
            imagePaths: getSelectedImageUrls(),
            referenceNotes: getSelectedImageNotes(),
            imageNotes: getSelectedImageNotesPerImage(),
            skipCompletenessCheck: skip ?? false,
            enhancedPrompt: overridePrompt || undefined,
          }),
        }
      );
      if (res.ok) {
        const data = await res.json();

        // Handle completeness check
        if (data.needsClarification && data.clarificationType === "completeness-check") {
          setRefining(false);
          setChatState({
            completenessCheck: {
              stage: data.stage,
              originalPrompt: data.originalPrompt,
              questions: data.questions,
              isMaskRefinement: false,
            },
            onEnhancedPromptConfirm: (enhancedPrompt: string) => {
              clearChatState();
              handleGenerateFace(enhancedPrompt, true);
            },
          });
          return;
        }

        if (data.needsConfirmation) {
          const notes = data.refinedNotes ?? [];
          setRefinedNotes(notes);
          setEditableRefinedNotes(notes.map((n: { refined: string }) => n.refined));
          setShowRefinedReview(true);

          // Build clarification context for questions
          const selectedAssets = moodboardAssets.filter((a) => selectedMoodboardIds.has(a.id));
          const questionsForChat = notes
            .map((n: { original: string; refined: string; question?: string; options?: string[] }, i: number) => ({
              index: i,
              original: n.original,
              refined: n.refined,
              question: n.question,
              options: n.options,
              imageUrl: selectedAssets[i]
                ? (selectedAssets[i].external_url ?? selectedAssets[i].storage_path ?? undefined)
                : undefined,
            }))
            .filter((n: { question?: string }) => n.question);

          // Unselected images the user can pick as alternatives
          const unselectedImages = moodboardAssets
            .filter((a) => !selectedMoodboardIds.has(a.id))
            .map((a) => ({ id: a.id, url: a.external_url ?? a.storage_path ?? "" }))
            .filter((a) => a.url);

          if (questionsForChat.length > 0) {
            const ctx = {
              description,
              notes: questionsForChat,
              availableImages: unselectedImages.length > 0 ? unselectedImages : undefined,
            };
            setClarificationContext(ctx);
            setChatState({ clarification: ctx, onNoteSuggestions: handleNoteSuggestions, onAlternativeSelected: handleAlternativeSelected });
          } else {
            setClarificationContext(undefined);
            clearChatState();
          }

          if (data.warnings?.length) {
            setReferenceWarnings(data.warnings);
            const warningText = `I noticed a potential issue with your generation setup:\n\n${data.warnings.join("\n\n")}\n\nCheck the refined notes below and adjust if needed. Let me know if you need help!`;
            setChatWarningMessage(warningText);
          }
          setRefining(false);
          return;
        }
        setRefining(false);
        setGenerating(true);
        setGenerateJobId((data as Job).id);
      } else {
        setRefining(false);
      }
    } catch {
      setRefining(false);
    }
  }, [params.projectId, description, getSelectedImageUrls, getSelectedImageNotes, getSelectedImageNotesPerImage, handleNoteSuggestions, handleAlternativeSelected, setChatState, clearChatState, moodboardAssets, selectedMoodboardIds]);

  const handleConfirmRefinedNotes = useCallback(async (overridePrompt?: string, skip?: boolean) => {
    setShowRefinedReview(false);
    setReferenceWarnings([]);
    setChatWarningMessage(undefined);
    setClarificationContext(undefined);
    clearChatState();
    setGenerating(true);
    try {
      const res = await fetch(
        `/api/projects/${params.projectId}/stage/1/generate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: overridePrompt || description,
            imagePaths: getSelectedImageUrls(),
            referenceNotes: getSelectedImageNotes(),
            confirmedNotes: editableRefinedNotes,
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
              handleConfirmRefinedNotes(enhancedPrompt, true);
            },
          });
          return;
        }
        setGenerateJobId((data as Job).id);
      } else {
        setGenerating(false);
      }
    } catch {
      setGenerating(false);
    }
  }, [params.projectId, description, getSelectedImageUrls, getSelectedImageNotes, editableRefinedNotes, clearChatState, setChatState]);

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
      <div className="h-full overflow-y-auto">
        <div className="mx-auto max-w-3xl space-y-6 px-6 py-4">
            {/* Title */}
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold tracking-tight">
                  Stage 1: <span className="font-serif italic">Model</span>{" "}
                  Generation
                </h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Describe your model, add reference images, and generate a face.
                </p>
              </div>
              <StageGuide
                items={[
                  "Write a description of how the model should look - age, ethnicity, facial features, hair color/style, eye color, skin tone.",
                  "Click 'Browse References' to add face reference images. The AI will blend traits from all references you add - it does not pick one face, it mixes features from all of them.",
                  "Use the note field under each reference image to tell the AI exactly what to take from that specific reference. For example: 'use the jawline and cheekbones' or 'match this skin tone'. Without notes, the AI decides what to blend.",
                  "Click 'Generate Face' to create the model. The assistant on the right may ask follow-up questions if the description is missing key details.",
                  "After generating, click 'Continue to Refinement & Angles' to paint corrections on the face and generate the model from different camera angles.",
                ]}
                tip="Reference images are not 'face swaps' - they are inspiration. The AI creates a new face by mixing traits from your references based on your notes. The more specific your notes, the more control you have over the result."
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="model-description">Model Description</Label>
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
                id="model-description"
                placeholder="Describe the model you want to generate..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="resize-y"
              />
              {showExamples && (
                <div className="grid gap-2 sm:grid-cols-2">
                  {MODEL_EXAMPLES.map((ex) => (
                    <button
                      key={ex.label}
                      type="button"
                      className="rounded-lg border border-border px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:bg-muted/60 hover:text-foreground"
                      onClick={() => {
                        setDescription(ex.text);
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

            {/* Reference images */}
            {moodboardAssets.length > 0 && (
              <div className="space-y-3" data-tour="model-moodboard">
                <div className="flex items-center justify-between">
                  <Label>
                    Reference Images
                    {selectedMoodboardIds.size > 0 && (
                      <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                        {selectedMoodboardIds.size} selected
                      </span>
                    )}
                  </Label>
                  <MoodboardBrowser
                    images={moodboardGridImages}
                    onAddFromPinterest={handleAddPinterestImage}
                    onAddFromLibrary={handleAddFromLibrary}
                    onUpload={handleUploadMoodboardImage}
                    onToggleSelect={handleToggleMoodboardSelect}
                    onRemove={handleRemoveMoodboardImage}
                    onNoteChange={handleNoteChange}
                    projectDescription={description || undefined}
                    uploading={uploading}
                    libraryCategory="model"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {moodboardAssets.map((a) => {
                    const url = a.external_url ?? a.storage_path ?? "";
                    const isSelected = selectedMoodboardIds.has(a.id);
                    return (
                      <div key={a.id} className="space-y-2">
                        <button
                          type="button"
                          onClick={() => handleToggleMoodboardSelect(a.id)}
                          className={cn(
                            "relative w-full overflow-hidden rounded-lg border-2 transition-colors",
                            isSelected
                              ? "border-blue-500 ring-2 ring-blue-500/20"
                              : "border-border hover:border-muted-foreground/40"
                          )}
                        >
                          <img
                            src={url}
                            alt="Reference"
                            className="aspect-square w-full object-cover"
                          />
                          <div
                            className={cn(
                              "absolute left-2 top-2 flex size-6 items-center justify-center rounded-full border-2 transition-colors",
                              isSelected
                                ? "border-blue-500 bg-blue-500 text-white"
                                : "border-white/70 bg-black/30 text-transparent"
                            )}
                          >
                            <Check className="size-3.5" />
                          </div>
                        </button>
                        {isSelected && (
                          <input
                            type="text"
                            value={notes[a.id] ?? ""}
                            onChange={(e) =>
                              handleNoteChange(a.id, e.target.value)
                            }
                            placeholder="e.g. &quot;I want his freckles&quot;"
                            className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/30"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {moodboardAssets.length === 0 && (
              <div data-tour="model-moodboard">
              <MoodboardBrowser
                images={moodboardGridImages}
                onAddFromPinterest={handleAddPinterestImage}
                onAddFromLibrary={handleAddFromLibrary}
                onUpload={handleUploadMoodboardImage}
                onToggleSelect={handleToggleMoodboardSelect}
                onRemove={handleRemoveMoodboardImage}
                onNoteChange={handleNoteChange}
                projectDescription={description || undefined}
                uploading={uploading}
                libraryCategory="model"
              />
              </div>
            )}

            {/* Generate button */}
            <DisabledTooltip
              message={
                !generating && !refining
                  ? [
                      !description.trim() && "Enter a model description",
                      uploading && "Wait for upload to finish",
                    ].filter(Boolean).join(" and ") || undefined
                  : undefined
              }
            >
            <Button
              data-tour="model-generate"
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
              disabled={generating || refining || !description.trim() || uploading}
              className="w-full py-6 text-base"
            >
              {refining ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Analyzing references...
                </>
              ) : generating ? (
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
            </DisabledTooltip>

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

            {/* Refined notes review */}
            {showRefinedReview && refinedNotes.length > 0 && (
              <div className="rounded-lg border border-border bg-card/50 p-4 space-y-4">
                <div>
                  <h3 className="text-sm font-semibold">Review refined reference notes</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    We analyzed your reference images and refined your notes into specific trait descriptions. Review and edit before generating.
                  </p>
                </div>

                {referenceWarnings.length > 0 && (
                  <div className="rounded-md border border-yellow-500/30 bg-yellow-500/5 px-3 py-2">
                    <p className="text-xs font-medium text-yellow-400">
                      Potential conflict detected — check the chat for details
                    </p>
                  </div>
                )}

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
                      setShowRefinedReview(false);
                      setReferenceWarnings([]);
                      setChatWarningMessage(undefined);
                      setClarificationContext(undefined);
                      clearChatState();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleConfirmRefinedNotes()}
                  >
                    Confirm &amp; Generate
                  </Button>
                </div>
              </div>
            )}

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
    </StageGate>
  );
}
