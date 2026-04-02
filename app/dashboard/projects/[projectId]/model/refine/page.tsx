"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Loader2,
  Maximize2,
  RotateCw,
  User,
  Wand2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { JobStatus } from "@/components/job-status";
import { MaskCanvas } from "@/components/projects/mask-canvas";
import { MoodboardBrowser } from "@/components/projects/moodboard-browser";
import { StageGate } from "@/components/projects/stage-gate";
import { ImageLightbox } from "@/components/ui/image-lightbox";
import { useHelpChat } from "@/components/projects/help-chat-context";
import { cn } from "@/lib/utils";
import { useFileUpload } from "@/lib/hooks";
import type { Project, ProjectAsset, Job } from "@/types";

const ANGLE_SET = [
  { angle: "front", label: "Front" },
  { angle: "front three-quarter left", label: "3/4 Left" },
  { angle: "front three-quarter right", label: "3/4 Right" },
  { angle: "left profile", label: "Profile L" },
  { angle: "right profile", label: "Profile R" },
];

function ReferenceImageGrid({
  images,
  selectedIds,
  onToggle,
  notes,
  onNoteChange,
  disabled,
  label,
}: {
  images: Array<{ id: string; url: string }>;
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  notes?: Record<string, string>;
  onNoteChange?: (id: string, note: string) => void;
  disabled?: boolean;
  label: string;
}) {
  if (images.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="grid grid-cols-3 gap-1.5">
        {images.map((img) => {
          const isSelected = selectedIds.has(img.id);
          return (
            <div key={img.id} className="space-y-1">
              <div
                className={cn(
                  "group relative aspect-square overflow-hidden rounded-md border-2 transition-colors duration-150",
                  isSelected
                    ? "border-primary"
                    : "border-transparent hover:border-muted-foreground/30"
                )}
              >
                <button
                  type="button"
                  onClick={() => onToggle(img.id)}
                  disabled={disabled}
                  className="absolute inset-0 h-full w-full"
                >
                  <Image
                    src={img.url}
                    alt="Reference"
                    fill
                    className="object-cover"
                    sizes="80px"
                  />
                  {isSelected && (
                    <div className="absolute inset-0 flex items-center justify-center bg-primary/30">
                      <Check className="h-4 w-4 text-white drop-shadow" />
                    </div>
                  )}
                </button>
                <ImageLightbox
                  src={img.url}
                  className="absolute top-1 right-1 z-10 rounded bg-black/50 p-0.5 opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <Maximize2 className="h-3 w-3 text-white" />
                </ImageLightbox>
              </div>
              {isSelected && onNoteChange && (
                <input
                  type="text"
                  value={notes?.[img.id] ?? ""}
                  onChange={(e) => onNoteChange(img.id, e.target.value)}
                  placeholder="e.g. &quot;use the hair&quot;"
                  disabled={disabled}
                  className="w-full rounded border border-border bg-background px-1.5 py-0.5 text-[10px] text-foreground placeholder:text-muted-foreground/50 focus:border-blue-500 focus:outline-none"
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function RefinePage() {
  const params = useParams<{ projectId: string }>();
  const router = useRouter();
  const { upload, uploading } = useFileUpload();
  const { setChatState, clearChatState } = useHelpChat();

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  // Face
  const [generatedFace, setGeneratedFace] = useState<ProjectAsset | null>(null);
  const [refinedFace, setRefinedFace] = useState<ProjectAsset | null>(null);
  const [moodboardAssets, setMoodboardAssets] = useState<ProjectAsset[]>([]);

  // Refinement
  const [refineJobId, setRefineJobId] = useState<string | null>(null);
  const [refining, setRefining] = useState(false);
  const [maskDataUrl, setMaskDataUrl] = useState<string | null>(null);
  const [refinePrompt, setRefinePrompt] = useState("");
  const [selectedRefineRefs, setSelectedRefineRefs] = useState<Set<string>>(
    new Set()
  );
  const [refineRefNotes, setRefineRefNotes] = useState<Record<string, string>>({});

  // Angles
  const [angleAssets, setAngleAssets] = useState<ProjectAsset[]>([]);
  const [angleAdjustments, setAngleAdjustments] = useState("");
  const [selectedAngleRefs, setSelectedAngleRefs] = useState<Set<string>>(
    new Set()
  );
  const [angleJobs, setAngleJobs] = useState<
    Map<string, { jobId: string | null; status: "idle" | "generating" | "done" }>
  >(new Map(ANGLE_SET.map((a) => [a.angle, { jobId: null, status: "idle" }])));
  const [generatingAllAngles, setGeneratingAllAngles] = useState(false);

  // Angle refinement
  const [selectedAngleForRefine, setSelectedAngleForRefine] = useState<string | null>(null);
  const [angleRefinePrompt, setAngleRefinePrompt] = useState("");
  const [angleRefineMask, setAngleRefineMask] = useState<string | null>(null);
  const [selectedAngleRefineRefs, setSelectedAngleRefineRefs] = useState<Set<string>>(new Set());
  const [angleRefineRefNotes, setAngleRefineRefNotes] = useState<Record<string, string>>({});
  const [angleRefineJobId, setAngleRefineJobId] = useState<string | null>(null);
  const [angleRefining, setAngleRefining] = useState(false);

  // Note refinement review
  const [showNoteReview, setShowNoteReview] = useState(false);
  const [refiningNotesLoading, setRefiningNotesLoading] = useState(false);
  const [refinedRefNotes, setRefinedRefNotes] = useState<{ original: string; refined: string; question?: string; options?: string[] }[]>([]);
  const [editableRefNotes, setEditableRefNotes] = useState<string[]>([]);
  const [clarificationContext, setClarificationContext] = useState<{
    description: string;
    notes: { index: number; original: string; refined: string; question: string; options?: string[]; imageUrl?: string }[];
    availableImages?: { id: string; url: string }[];
  } | undefined>(undefined);

  // Approve
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
        }

        if (assetsRes.ok) {
          const allAssets: ProjectAsset[] = await assetsRes.json();
          setMoodboardAssets(allAssets.filter((a) => a.asset_type === "face_moodboard"));

          const face = allAssets.find((a) => a.asset_type === "refined_face");
          if (face) {
            setRefinedFace(face);
          } else {
            const gen = allAssets.find((a) => a.asset_type === "generated_face");
            if (gen) setGeneratedFace(gen);
          }

          const angles = allAssets.filter((a) => a.asset_type === "face_angle");
          setAngleAssets(angles);

          if (angles.length > 0) {
            setAngleJobs((prev) => {
              const next = new Map(prev);
              for (const asset of angles) {
                const angle = (asset.metadata as Record<string, unknown>)?.angle as string;
                if (angle && next.has(angle)) {
                  next.set(angle, { jobId: null, status: "done" });
                }
              }
              return next;
            });
          }
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params.projectId]);

  // -- Add reference image --

  const handleUploadReference = useCallback(
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

  const handleAddPinterestReference = useCallback(
    async (imageUrl: string) => {
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
        setSelectedRefineRefs((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [params.projectId]
  );

  const moodboardGridImages = moodboardAssets.map((a) => ({
    id: a.id,
    url: a.external_url ?? a.storage_path ?? "",
    selected: selectedRefineRefs.has(a.id),
    note: refineRefNotes[a.id] ?? "",
  }));

  // -- Derived --

  const currentFaceUrl =
    (refinedFace?.storage_path ?? refinedFace?.external_url) ??
    (generatedFace?.storage_path ?? generatedFace?.external_url);

  const hasFace = !!(generatedFace || refinedFace);

  const moodboardReferenceImages = moodboardAssets.map((a) => ({
    id: a.id,
    url: a.external_url ?? a.storage_path ?? "",
  }));

  const doneAngleCount = Array.from(angleJobs.values()).filter(
    (j) => j.status === "done"
  ).length;

  // -- Refinement handlers --

  const executeRefine = useCallback(async (finalNotes?: string) => {
    if (!currentFaceUrl || !maskDataUrl) return;

    setRefining(true);
    const selectedUrls = moodboardReferenceImages
      .filter((img) => selectedRefineRefs.has(img.id))
      .map((img) => img.url);

    const fullPrompt = finalNotes
      ? `${refinePrompt.trim()}\n\nReference image notes:\n${finalNotes}`
      : refinePrompt.trim();

    try {
      const res = await fetch(
        `/api/projects/${params.projectId}/stage/1/mask-refine`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: fullPrompt,
            maskPath: maskDataUrl,
            imagePaths: [currentFaceUrl, ...selectedUrls],
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
  }, [params.projectId, currentFaceUrl, maskDataUrl, refinePrompt, selectedRefineRefs, moodboardReferenceImages]);

  const handleNoteSuggestions = useCallback(
    (updates: { index: number; refined: string }[]) => {
      setEditableRefNotes((prev) => {
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
      setSelectedRefineRefs((prev) => {
        const next = new Set(prev);
        next.add(alt.imageId);
        return next;
      });
      setRefineRefNotes((prev) => ({ ...prev, [alt.imageId]: alt.note }));
    },
    []
  );

  const handleRefine = useCallback(async () => {
    if (!maskDataUrl || !refinePrompt.trim()) {
      const missing: string[] = [];
      if (!maskDataUrl) missing.push("paint a mask on the image");
      if (!refinePrompt.trim()) missing.push("enter a description");
      toast.warning(`To refine: ${missing.join(" and ")}`);
      return;
    }
    if (!currentFaceUrl) return;

    // Check if we have reference images with notes that need refinement
    const selectedImages = moodboardReferenceImages.filter((img) => selectedRefineRefs.has(img.id));
    const hasNotes = selectedImages.some((img) => refineRefNotes[img.id]);

    if (!hasNotes) {
      // No notes to refine, go straight to mask-refine
      executeRefine();
      return;
    }

    // Refine the notes first via the generate endpoint's refinement step
    setRefiningNotesLoading(true);
    try {
      const imageNotes = selectedImages.map((img) => ({
        url: img.url,
        note: refineRefNotes[img.id] ?? "",
      }));

      const res = await fetch(
        `/api/projects/${params.projectId}/stage/1/generate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: refinePrompt.trim(),
            imagePaths: selectedImages.map((img) => img.url),
            imageNotes,
            skipWarnings: true,
          }),
        }
      );

      if (res.ok) {
        const data = await res.json();
        if (data.needsConfirmation) {
          const notes = data.refinedNotes ?? [];
          setRefinedRefNotes(notes);
          setEditableRefNotes(notes.map((n: { refined: string }) => n.refined));
          setShowNoteReview(true);

          // Build clarification context
          const questionsForChat = notes
            .map((n: { original: string; refined: string; question?: string; options?: string[] }, i: number) => ({
              index: i,
              original: n.original,
              refined: n.refined,
              question: n.question,
              options: n.options,
              imageUrl: selectedImages[i]?.url,
            }))
            .filter((n: { question?: string }) => n.question);

          const unselectedImages = moodboardAssets
            .filter((a) => !selectedRefineRefs.has(a.id))
            .map((a) => ({ id: a.id, url: a.external_url ?? a.storage_path ?? "" }))
            .filter((a) => a.url);

          if (questionsForChat.length > 0) {
            const ctx = {
              description: refinePrompt.trim(),
              notes: questionsForChat,
              availableImages: unselectedImages.length > 0 ? unselectedImages : undefined,
            };
            setClarificationContext(ctx);
            setChatState({ clarification: ctx, onNoteSuggestions: handleNoteSuggestions, onAlternativeSelected: handleAlternativeSelected });
          } else {
            setClarificationContext(undefined);
            clearChatState();
          }
        } else {
          // No notes needed refinement, just go
          executeRefine();
        }
      } else {
        // Refinement failed, proceed with raw notes
        const rawNotes = selectedImages
          .filter((img) => refineRefNotes[img.id])
          .map((img) => `- ${refineRefNotes[img.id]}`)
          .join("\n");
        executeRefine(rawNotes);
      }
    } catch {
      // On error, proceed with raw notes
      const rawNotes = selectedImages
        .filter((img) => refineRefNotes[img.id])
        .map((img) => `- ${refineRefNotes[img.id]}`)
        .join("\n");
      executeRefine(rawNotes);
    } finally {
      setRefiningNotesLoading(false);
    }
  }, [params.projectId, currentFaceUrl, maskDataUrl, refinePrompt, selectedRefineRefs, moodboardReferenceImages, refineRefNotes, moodboardAssets, executeRefine, setChatState, clearChatState, handleNoteSuggestions, handleAlternativeSelected]);

  const handleConfirmRefNotes = useCallback(() => {
    setShowNoteReview(false);
    setClarificationContext(undefined);
    clearChatState();
    const finalNotes = editableRefNotes.filter(Boolean).map((n) => `- ${n}`).join("\n");
    executeRefine(finalNotes);
  }, [editableRefNotes, executeRefine, clearChatState]);

  const handleRefineComplete = useCallback(
    async (job: Job) => {
      setRefining(false);
      setRefineJobId(null);
      if (job.result_image) {
        const res = await fetch(`/api/projects/${params.projectId}/assets`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            stage: 1,
            asset_type: "refined_face",
            source: "gemini",
            storage_path: job.result_image,
          }),
        });
        if (res.ok) {
          const asset: ProjectAsset = await res.json();
          setRefinedFace(asset);
        }
      }
    },
    [params.projectId]
  );

  // -- Angle handlers --

  const handleGenerateSingleAngle = useCallback(
    async (angle: string) => {
      if (!currentFaceUrl) return;

      setAngleJobs((prev) => {
        const next = new Map(prev);
        next.set(angle, { jobId: null, status: "generating" });
        return next;
      });

      try {
        const selectedUrls = moodboardAssets
          .filter((a) => selectedAngleRefs.has(a.id))
          .map((a) => a.external_url ?? a.storage_path ?? "")
          .filter(Boolean);

        const res = await fetch("/api/generate-perspective", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imagePath: currentFaceUrl,
            angle,
            adjustments: angleAdjustments || undefined,
            referenceImages: selectedUrls.length > 0 ? selectedUrls : undefined,
          }),
        });

        if (res.ok) {
          const job: Job = await res.json();
          setAngleJobs((prev) => {
            const next = new Map(prev);
            next.set(angle, { jobId: job.id, status: "generating" });
            return next;
          });
        } else {
          setAngleJobs((prev) => {
            const next = new Map(prev);
            next.set(angle, { jobId: null, status: "idle" });
            return next;
          });
        }
      } catch {
        setAngleJobs((prev) => {
          const next = new Map(prev);
          next.set(angle, { jobId: null, status: "idle" });
          return next;
        });
      }
    },
    [currentFaceUrl, angleAdjustments, selectedAngleRefs, moodboardAssets]
  );

  const handleGenerateAllAngles = useCallback(async () => {
    setGeneratingAllAngles(true);
    for (const { angle } of ANGLE_SET) {
      const entry = angleJobs.get(angle);
      if (entry?.status !== "done") {
        await handleGenerateSingleAngle(angle);
      }
    }
    setGeneratingAllAngles(false);
  }, [angleJobs, handleGenerateSingleAngle]);

  const handleAngleJobComplete = useCallback(
    (angle: string) => async (job: Job) => {
      setAngleJobs((prev) => {
        const next = new Map(prev);
        next.set(angle, { jobId: null, status: "done" });
        return next;
      });

      if (job.result_image) {
        const res = await fetch(`/api/projects/${params.projectId}/assets`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            stage: 1,
            asset_type: "face_angle",
            source: "gemini",
            storage_path: job.result_image,
            metadata: { angle },
          }),
        });
        if (res.ok) {
          const asset: ProjectAsset = await res.json();
          setAngleAssets((prev) => [...prev, asset]);
        }
      }
    },
    [params.projectId]
  );

  // -- Angle refinement --

  const selectedAngleAsset = angleAssets.find((a) => {
    const meta = a.metadata as Record<string, unknown>;
    return meta?.angle === selectedAngleForRefine;
  });
  const selectedAngleUrl = selectedAngleAsset?.storage_path ?? selectedAngleAsset?.external_url;

  const handleAngleRefine = useCallback(async () => {
    if (!angleRefineMask || !angleRefinePrompt.trim() || !selectedAngleUrl) {
      const missing: string[] = [];
      if (!angleRefineMask) missing.push("paint a mask");
      if (!angleRefinePrompt.trim()) missing.push("enter a description");
      toast.warning(`To refine angle: ${missing.join(" and ")}`);
      return;
    }

    setAngleRefining(true);
    const selectedImages = moodboardReferenceImages.filter((img) => selectedAngleRefineRefs.has(img.id));
    const selectedUrls = selectedImages.map((img) => img.url);

    const refNotes = selectedImages
      .filter((img) => angleRefineRefNotes[img.id])
      .map((img) => `- Reference note: ${angleRefineRefNotes[img.id]}`)
      .join("\n");
    const fullPrompt = refNotes
      ? `${angleRefinePrompt.trim()}\n\nReference image notes:\n${refNotes}`
      : angleRefinePrompt.trim();

    try {
      const res = await fetch(
        `/api/projects/${params.projectId}/stage/1/mask-refine`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: fullPrompt,
            maskPath: angleRefineMask,
            imagePaths: [selectedAngleUrl, ...selectedUrls],
          }),
        }
      );
      if (res.ok) {
        const job: Job = await res.json();
        setAngleRefineJobId(job.id);
      } else {
        setAngleRefining(false);
      }
    } catch {
      setAngleRefining(false);
    }
  }, [params.projectId, selectedAngleUrl, angleRefineMask, angleRefinePrompt, selectedAngleRefineRefs, moodboardReferenceImages, angleRefineRefNotes]);

  const handleAngleRefineComplete = useCallback(
    async (job: Job) => {
      setAngleRefining(false);
      setAngleRefineJobId(null);
      if (job.result_image && selectedAngleForRefine) {
        const res = await fetch(`/api/projects/${params.projectId}/assets`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            stage: 1,
            asset_type: "face_angle",
            source: "gemini",
            storage_path: job.result_image,
            metadata: { angle: selectedAngleForRefine },
          }),
        });
        if (res.ok) {
          const asset: ProjectAsset = await res.json();
          setAngleAssets((prev) => {
            const filtered = prev.filter((a) => {
              const meta = a.metadata as Record<string, unknown>;
              return meta?.angle !== selectedAngleForRefine;
            });
            return [...filtered, asset];
          });
        }
      }
    },
    [params.projectId, selectedAngleForRefine]
  );

  // -- Approve --

  const handleApprove = useCallback(async () => {
    setApproving(true);
    try {
      await fetch(`/api/projects/${params.projectId}/stage/1/approve`, {
        method: "POST",
      });
      router.push(`/dashboard/projects/${params.projectId}/environment`);
    } finally {
      setApproving(false);
    }
  }, [params.projectId, router]);

  // -- Render --

  if (loading || !project) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!hasFace) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3">
        <p className="text-sm text-muted-foreground">
          No face generated yet. Go back to generate one first.
        </p>
        <Button
          variant="outline"
          onClick={() =>
            router.push(`/dashboard/projects/${params.projectId}/model`)
          }
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Generation
        </Button>
      </div>
    );
  }

  return (
    <StageGate currentStage={project.current_stage} requiredStage={1}>
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl space-y-6 px-6 py-4">
            {/* Header */}
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  router.push(
                    `/dashboard/projects/${params.projectId}/model`
                  )
                }
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <div>
                <h2 className="text-lg font-semibold tracking-tight">
                  Refinement & Angles
                </h2>
                <p className="text-sm text-muted-foreground">
                  Refine the face, then generate perspective angles.
                </p>
              </div>
            </div>

            {/* Face + Refinement sidebar */}
            <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
              <div
                className="flex flex-col"
                style={{ maxHeight: "50vh", minHeight: 280 }}
              >
                {currentFaceUrl && (
                  <MaskCanvas
                    imageUrl={currentFaceUrl}
                    onExportMask={setMaskDataUrl}
                  />
                )}
              </div>

              <div className="flex flex-col gap-3">
                <h3 className="text-sm font-semibold">Refinement</h3>

                <Textarea
                  value={refinePrompt}
                  onChange={(e) => setRefinePrompt(e.target.value)}
                  placeholder="Describe what should change in the masked area..."
                  rows={2}
                  disabled={refining}
                  className="text-sm"
                />

                <ReferenceImageGrid
                  images={moodboardReferenceImages}
                  selectedIds={selectedRefineRefs}
                  onToggle={(id) =>
                    setSelectedRefineRefs((prev) => {
                      const next = new Set(prev);
                      next.has(id) ? next.delete(id) : next.add(id);
                      return next;
                    })
                  }
                  notes={refineRefNotes}
                  onNoteChange={(id, note) =>
                    setRefineRefNotes((prev) => ({ ...prev, [id]: note }))
                  }
                  disabled={refining}
                  label="Click to use as reference"
                />

                <MoodboardBrowser
                  images={moodboardGridImages}
                  onAddFromPinterest={handleAddPinterestReference}
                  onAddFromLibrary={handleAddFromLibrary}
                  onUpload={handleUploadReference}
                  onToggleSelect={(id) =>
                    setSelectedRefineRefs((prev) => {
                      const next = new Set(prev);
                      next.has(id) ? next.delete(id) : next.add(id);
                      return next;
                    })
                  }
                  onRemove={handleRemoveMoodboardImage}
                  uploading={uploading}
                  libraryCategory="model"
                />

                <Button
                  onClick={handleRefine}
                  disabled={refining || refiningNotesLoading || showNoteReview}
                  className="w-full"
                >
                  {refiningNotesLoading ? (
                    <>
                      <Loader2 className="animate-spin" />
                      Analyzing references...
                    </>
                  ) : refining ? (
                    <>
                      <Loader2 className="animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Wand2 />
                      Refine
                    </>
                  )}
                </Button>

                {/* Note review panel */}
                {showNoteReview && refinedRefNotes.length > 0 && (
                  <div className="rounded-lg border border-border bg-card/50 p-3 space-y-3">
                    <div>
                      <h4 className="text-xs font-semibold">Review refined notes</h4>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        We analyzed your references. Review and edit before refining.
                      </p>
                    </div>
                    <div className="space-y-2">
                      {refinedRefNotes.map((note, i) => (
                        <div key={i} className="space-y-1">
                          <p className="text-[10px] text-muted-foreground">
                            &ldquo;{note.original}&rdquo;
                          </p>
                          <Textarea
                            value={editableRefNotes[i] ?? ""}
                            onChange={(e) => {
                              const updated = [...editableRefNotes];
                              updated[i] = e.target.value;
                              setEditableRefNotes(updated);
                            }}
                            rows={2}
                            className="text-xs"
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
                      <Button size="sm" onClick={handleConfirmRefNotes}>
                        Confirm & Refine
                      </Button>
                    </div>
                  </div>
                )}

                {refineJobId && (
                  <JobStatus
                    jobId={refineJobId}
                    onComplete={handleRefineComplete}
                  />
                )}
              </div>
            </div>

            {/* Angle Generation */}
            <Separator />
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold">Angle Generation</h3>
                <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                  1.1
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Generate perspective angles of the model face. Click an
                individual angle or generate all at once. Click a completed
                angle to refine it.
              </p>

              {/* Adjustments */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  Additional adjustments (optional)
                </Label>
                <Textarea
                  value={angleAdjustments}
                  onChange={(e) => setAngleAdjustments(e.target.value)}
                  placeholder='e.g. "Keep freckles prominent, maintain jawline definition"'
                  rows={2}
                  className="text-sm"
                />
              </div>

              {/* Angle reference images */}
              <ReferenceImageGrid
                images={moodboardReferenceImages}
                selectedIds={selectedAngleRefs}
                onToggle={(id) =>
                  setSelectedAngleRefs((prev) => {
                    const next = new Set(prev);
                    next.has(id) ? next.delete(id) : next.add(id);
                    return next;
                  })
                }
                label="Click to use as reference for angles (optional)"
              />

              {/* Angle buttons */}
              <div className="flex flex-wrap items-center gap-2">
                {ANGLE_SET.map(({ angle, label }) => {
                  const entry = angleJobs.get(angle);
                  const status = entry?.status ?? "idle";
                  return (
                    <Button
                      key={angle}
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        status === "idle"
                          ? handleGenerateSingleAngle(angle)
                          : undefined
                      }
                      disabled={status === "generating" || !currentFaceUrl}
                      className={cn(
                        "text-xs",
                        status === "done" &&
                          "border-green-600/50 text-green-500"
                      )}
                    >
                      {status === "done" && <CheckCircle2 className="h-3 w-3" />}
                      {status === "generating" && (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      )}
                      {label}
                    </Button>
                  );
                })}
                <Button
                  variant="secondary"
                  size="sm"
                  className="ml-auto text-xs"
                  onClick={handleGenerateAllAngles}
                  disabled={
                    generatingAllAngles ||
                    !currentFaceUrl ||
                    doneAngleCount === ANGLE_SET.length
                  }
                >
                  <RotateCw
                    className={cn(
                      "h-3 w-3",
                      generatingAllAngles && "animate-spin"
                    )}
                  />
                  Generate All
                </Button>
              </div>

              {/* Job statuses */}
              {Array.from(angleJobs.entries()).map(([angle, entry]) =>
                entry.jobId ? (
                  <JobStatus
                    key={angle}
                    jobId={entry.jobId}
                    onComplete={handleAngleJobComplete(angle)}
                  />
                ) : null
              )}

              {/* Angle grid */}
              <div className="grid grid-cols-5 gap-2">
                {ANGLE_SET.map(({ angle, label }) => {
                  const asset = angleAssets.find((a) => {
                    const meta = a.metadata as Record<string, unknown>;
                    return meta?.angle === angle;
                  });
                  const url = asset?.storage_path ?? asset?.external_url;
                  const isSelected = selectedAngleForRefine === angle;
                  const jobEntry = angleJobs.get(angle);
                  const isGenerating = jobEntry?.status === "generating";

                  if (!asset || !url) {
                    return (
                      <div
                        key={angle}
                        className={cn(
                          "flex aspect-[3/4] flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-xs",
                          isGenerating
                            ? "border-amber-500/50 text-amber-500"
                            : "border-border text-muted-foreground/50"
                        )}
                      >
                        {isGenerating ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <User className="h-4 w-4" />
                        )}
                        <span>{label}</span>
                      </div>
                    );
                  }

                  return (
                    <button
                      key={angle}
                      type="button"
                      onClick={() =>
                        setSelectedAngleForRefine(isSelected ? null : angle)
                      }
                      className={cn(
                        "relative aspect-[3/4] overflow-hidden rounded-lg border-2 transition-all",
                        isSelected
                          ? "border-primary shadow-[0_0_12px_rgba(124,58,237,0.3)]"
                          : "border-border hover:border-muted-foreground/40"
                      )}
                    >
                      <Image
                        src={url}
                        alt={label}
                        fill
                        className="object-cover"
                        sizes="200px"
                      />
                      <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
                        {label}
                      </span>
                      {isSelected && (
                        <span className="absolute top-1 right-1 rounded bg-primary px-1 py-0.5 text-[9px] text-primary-foreground">
                          selected
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {doneAngleCount > 0 && !selectedAngleForRefine && (
                <p className="text-center text-xs text-muted-foreground">
                  Click a completed angle above to refine it
                </p>
              )}
            </div>

            {/* Angle Refinement */}
            {selectedAngleForRefine && selectedAngleUrl && (
              <div className="rounded-lg border border-primary/20 bg-primary/[0.03] p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold">
                    Refine:{" "}
                    {ANGLE_SET.find((a) => a.angle === selectedAngleForRefine)?.label}
                  </h3>
                  <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                    1.2
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedAngleForRefine(null);
                      setAngleRefinePrompt("");
                      setAngleRefineMask(null);
                      setSelectedAngleRefineRefs(new Set());
                    }}
                    className="ml-auto text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
                  <div className="flex flex-col" style={{ minHeight: 300 }}>
                    <MaskCanvas
                      imageUrl={selectedAngleUrl}
                      onExportMask={setAngleRefineMask}
                    />
                  </div>

                  <div className="flex flex-col gap-3">
                    <Textarea
                      value={angleRefinePrompt}
                      onChange={(e) => setAngleRefinePrompt(e.target.value)}
                      placeholder="What should change?"
                      rows={2}
                      disabled={angleRefining}
                      className="text-sm"
                    />

                    <ReferenceImageGrid
                      images={moodboardReferenceImages}
                      selectedIds={selectedAngleRefineRefs}
                      onToggle={(id) =>
                        setSelectedAngleRefineRefs((prev) => {
                          const next = new Set(prev);
                          next.has(id) ? next.delete(id) : next.add(id);
                          return next;
                        })
                      }
                      notes={angleRefineRefNotes}
                      onNoteChange={(id, note) =>
                        setAngleRefineRefNotes((prev) => ({ ...prev, [id]: note }))
                      }
                      disabled={angleRefining}
                      label="Reference images"
                    />

                    <MoodboardBrowser
                      images={moodboardGridImages}
                      onAddFromPinterest={handleAddPinterestReference}
                      onAddFromLibrary={handleAddFromLibrary}
                      onUpload={handleUploadReference}
                      onToggleSelect={(id) =>
                        setSelectedAngleRefineRefs((prev) => {
                          const next = new Set(prev);
                          next.has(id) ? next.delete(id) : next.add(id);
                          return next;
                        })
                      }
                      onRemove={handleRemoveMoodboardImage}
                      uploading={uploading}
                      libraryCategory="model"
                    />

                    <Button
                      onClick={handleAngleRefine}
                      disabled={angleRefining}
                      className="w-full"
                    >
                      {angleRefining ? (
                        <>
                          <Loader2 className="animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Wand2 />
                          Refine Angle
                        </>
                      )}
                    </Button>

                    {angleRefineJobId && (
                      <JobStatus
                        jobId={angleRefineJobId}
                        onComplete={handleAngleRefineComplete}
                      />
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Approve */}
            {hasFace && (
              <>
                <Separator />
                <div className="flex justify-end pb-4">
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
              </>
            )}
          </div>
        </div>
    </StageGate>
  );
}
