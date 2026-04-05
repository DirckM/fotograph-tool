"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Check, ChevronDown, Loader2, Sparkles, CheckCircle2, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { JobStatus } from "@/components/job-status";
import { StageLayout } from "@/components/projects/stage-layout";
import { MoodboardBrowser } from "@/components/projects/moodboard-browser";
import { RefinementControls } from "@/components/projects/refinement-panel";
import { MaskCanvas } from "@/components/projects/mask-canvas";
import { StageGate } from "@/components/projects/stage-gate";
import { cn } from "@/lib/utils";
import { DisabledTooltip } from "@/components/ui/disabled-tooltip";
import { useFileUpload } from "@/lib/hooks";
import { useHelpChat } from "@/components/projects/help-chat-context";
import type { Project, ProjectAsset, Job } from "@/types";

interface MoodboardImage {
  id: string;
  url: string;
  selected: boolean;
  note?: string;
}

function OptionRow({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const isSelected = value === opt;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(isSelected ? "" : opt)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all",
                isSelected
                  ? "border-blue-500/50 bg-blue-500/15 text-blue-400"
                  : "border-border/60 bg-background/50 text-muted-foreground hover:border-foreground/20 hover:text-foreground"
              )}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function resolveAssetUrl(asset: ProjectAsset): string {
  const url = asset.external_url ?? asset.storage_path ?? "";
  if (!url) return "";
  if (url.startsWith("http")) return url;
  // Relative storage path — resolve to Supabase public URL
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (supabaseUrl) {
    return `${supabaseUrl}/storage/v1/object/public/project-assets/${url}`;
  }
  return url;
}

const ENV_EXAMPLES = [
  {
    label: "Parisian apartment",
    text: "Luxury parisian apartment, large windows, golden hour sunlight, warm wooden floor, minimalist furniture, neutral tones",
  },
  {
    label: "Studio - clean",
    text: "Professional photography studio, seamless white background, softbox lighting, clean and minimal",
  },
  {
    label: "Urban rooftop",
    text: "Concrete rooftop at sunset, city skyline in background, warm golden light, industrial pipes and vents, gritty texture",
  },
  {
    label: "Nature - forest",
    text: "Dense forest clearing, dappled sunlight through canopy, moss-covered ground, soft green tones, early morning mist",
  },
  {
    label: "Brutalist architecture",
    text: "Raw concrete brutalist building interior, geometric shapes, harsh directional light, deep shadows, monochrome feel",
  },
  {
    label: "Beach golden hour",
    text: "Sandy beach at golden hour, warm low sun, gentle waves, soft pastel sky, relaxed coastal atmosphere",
  },
];

export default function EnvironmentStagePage() {
  const params = useParams<{ projectId: string }>();
  const router = useRouter();
  const { upload, uploading } = useFileUpload();
  const { setChatState, clearChatState } = useHelpChat();

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [prompt, setPrompt] = useState("");
  const [showExamples, setShowExamples] = useState(false);
  const [moodboard, setMoodboard] = useState<MoodboardImage[]>([]);
  const [generating, setGenerating] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [approving, setApproving] = useState(false);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [showEnvOptions, setShowEnvOptions] = useState(false);
  const [envOptions, setEnvOptions] = useState({
    lighting: "" as string,
    lightSource: "" as string,
    timeOfDay: "" as string,
    camera: "" as string,
    mood: "" as string,
  });
  const [refineJobId, setRefineJobId] = useState<string | null>(null);
  const [refining, setRefining] = useState(false);
  const [maskDataUrl, setMaskDataUrl] = useState<string | null>(null);

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
              url: resolveAssetUrl(a),
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
          storage_path: result.publicUrl,
          source: "upload",
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
          stage: 2,
          asset_type: "env_moodboard",
          source: "upload",
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

  const executeGeneration = useCallback(async (overridePrompt?: string, skip?: boolean) => {
    const selectedImages = moodboard.filter((img) => img.selected);
    const selectedUrls = selectedImages.map((img) => img.url);
    const refNotes = selectedImages
      .filter((img) => notes[img.id])
      .map((img) => `- ${notes[img.id]}`)
      .join("\n");

    const details = [
      envOptions.lighting && `Lighting: ${envOptions.lighting}`,
      envOptions.lightSource && `Light source: ${envOptions.lightSource}`,
      envOptions.timeOfDay && `Time of day: ${envOptions.timeOfDay}`,
      envOptions.camera && `Camera angle: ${envOptions.camera}`,
      envOptions.mood && `Mood: ${envOptions.mood}`,
    ].filter(Boolean).join(". ");
    const basePrompt = overridePrompt || prompt.trim();
    const fullPrompt = details ? `${basePrompt}\n\n${details}` : basePrompt;

    setGenerating(true);
    setResultImage(null);

    try {
      const res = await fetch(
        `/api/projects/${params.projectId}/stage/2/generate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: fullPrompt,
            imagePaths: selectedUrls,
            referenceNotes: refNotes || undefined,
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
              executeGeneration(enhancedPrompt, true);
            },
          });
          return;
        }
        setJobId(data.id);
      }
    } finally {
      setGenerating(false);
    }
  }, [params.projectId, prompt, moodboard, notes, envOptions, setChatState, clearChatState]);

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) return;
    executeGeneration();
  }, [prompt, executeGeneration]);

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

  const executeRefine = useCallback(
    async (data: {
      prompt: string;
      maskDataUrl: string;
      referenceImagePaths?: string[];
    }, overridePrompt?: string, skip?: boolean) => {
      if (!resultImage) return;

      setRefining(true);

      try {
        const res = await fetch(
          `/api/projects/${params.projectId}/stage/2/mask-refine`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              prompt: overridePrompt || data.prompt,
              imagePaths: [
                resultImage,
                ...(data.referenceImagePaths ?? []),
              ],
              maskPath: data.maskDataUrl,
              skipCompletenessCheck: skip ?? false,
              enhancedPrompt: overridePrompt || undefined,
            }),
          }
        );

        if (res.ok) {
          const result = await res.json();
          if (result.needsClarification && result.clarificationType === "completeness-check") {
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
        }
      } finally {
        setRefining(false);
      }
    },
    [params.projectId, resultImage, setChatState, clearChatState]
  );

  const handleRefine = useCallback(
    (data: {
      prompt: string;
      maskDataUrl: string;
      referenceImagePaths?: string[];
    }) => {
      executeRefine(data);
    },
    [executeRefine]
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
      <StageLayout
        title={
          <>
            Stage 2: <span className="text-heading">Environment</span> Creation
          </>
        }
        description="Describe and generate the photographic environment for your scene."
        guide={[
          "Describe the setting in detail - location type, materials, colors, mood. The more specific, the better the result.",
          "Use the options row (lighting, time of day, style) to quickly add modifiers without typing them out.",
          "Click 'Browse References' to add location/atmosphere reference images. The AI will match the overall feel, not copy the exact space.",
          "Click 'Generate' - the assistant may ask follow-up questions if details are missing (e.g. indoor vs outdoor, color palette).",
          "After generating, use the mask tool to paint over areas you want to change. Describe what should replace the painted area and click 'Refine'.",
        ]}
        guideTip="Reference images guide the mood and atmosphere, not the exact layout. Add notes per reference to specify what to take from it (e.g. 'match the warm lighting' or 'use this floor texture')."
        contentKey={resultImage ? "result" : "setup"}
        aside={
          resultImage ? (
            <div className="flex flex-col gap-4">
              <RefinementControls
                onRefine={handleRefine}
                referenceImages={selectedMoodboard.map((img) => ({
                  id: img.id,
                  url: img.url,
                }))}
                isProcessing={refining || !!refineJobId}
                maskDataUrl={maskDataUrl}
              />

              {refineJobId && (
                <JobStatus
                  jobId={refineJobId}
                  onComplete={handleRefineComplete}
                />
              )}

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
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="env-prompt">
                    Describe the environment you want to create
                  </Label>
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
                  id="env-prompt"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe the setting, lighting, mood..."
                  rows={4}
                />
                {showExamples && (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {ENV_EXAMPLES.map((ex) => (
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

              {/* Environment options — collapsible */}
              {(() => {
                const activeCount = Object.values(envOptions).filter(Boolean).length;
                return (
                  <div className="rounded-lg border border-border/60">
                    <button
                      type="button"
                      onClick={() => setShowEnvOptions((p) => !p)}
                      className="flex w-full items-center justify-between px-3 py-2 text-left"
                      data-tour="env-options"
                    >
                      <span className="text-xs font-medium text-muted-foreground">
                        Lighting & mood
                        {activeCount > 0 && (
                          <span className="ml-1.5 rounded-full bg-blue-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-blue-400">
                            {activeCount}
                          </span>
                        )}
                      </span>
                      <ChevronDown className={cn(
                        "size-3.5 text-muted-foreground transition-transform",
                        showEnvOptions && "rotate-180"
                      )} />
                    </button>
                    {showEnvOptions && (
                      <div className="space-y-3 border-t border-border/40 px-3 pb-3 pt-2">
                        <OptionRow
                          label="Lighting"
                          options={["Natural daylight", "Golden hour", "Overcast soft", "Studio flash", "Neon/colored", "Candlelight", "Dramatic shadows"]}
                          value={envOptions.lighting}
                          onChange={(v) => setEnvOptions((p) => ({ ...p, lighting: v }))}
                        />
                        <OptionRow
                          label="Light source"
                          options={["Through windows", "Overhead", "Side/directional", "Backlit", "Multiple sources", "Ambient only"]}
                          value={envOptions.lightSource}
                          onChange={(v) => setEnvOptions((p) => ({ ...p, lightSource: v }))}
                        />
                        <OptionRow
                          label="Time of day"
                          options={["Morning", "Midday", "Afternoon", "Sunset", "Blue hour", "Night"]}
                          value={envOptions.timeOfDay}
                          onChange={(v) => setEnvOptions((p) => ({ ...p, timeOfDay: v }))}
                        />
                        <OptionRow
                          label="Camera angle"
                          options={["Eye level", "Low angle", "High angle", "Wide establishing", "Close-up detail", "Dutch angle"]}
                          value={envOptions.camera}
                          onChange={(v) => setEnvOptions((p) => ({ ...p, camera: v }))}
                        />
                        <OptionRow
                          label="Mood"
                          options={["Warm & inviting", "Cool & minimal", "Moody & cinematic", "Bright & airy", "Edgy & raw", "Luxurious & polished"]}
                          value={envOptions.mood}
                          onChange={(v) => setEnvOptions((p) => ({ ...p, mood: v }))}
                        />
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Reference images with notes */}
              {moodboard.length > 0 && (
                <div className="space-y-2">
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
                      libraryCategory="env"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {moodboard.map((img) => (
                      <div key={img.id} className="space-y-1.5">
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
                              "absolute left-1.5 top-1.5 flex size-5 items-center justify-center rounded-full border-2 transition-colors",
                              img.selected
                                ? "border-blue-500 bg-blue-500 text-white"
                                : "border-white/70 bg-black/30 text-transparent"
                            )}
                          >
                            <Check className="size-3" />
                          </div>
                        </button>
                        {img.selected && (
                          <input
                            type="text"
                            value={notes[img.id] ?? ""}
                            onChange={(e) => handleNoteChange(img.id, e.target.value)}
                            placeholder="e.g. &quot;this lighting&quot;"
                            className="w-full rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground/50 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/30"
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
                  libraryCategory="env"
                />
              )}

              <DisabledTooltip
                message={
                  !generating && !jobId && !prompt.trim()
                    ? "Describe the environment"
                    : undefined
                }
              >
                <Button
                  size="lg"
                  onClick={handleGenerate}
                  disabled={generating || !prompt.trim() || !!jobId}
                  className="w-full"
                  data-tour="env-generate"
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
              </DisabledTooltip>

              <JobStatus jobId={jobId} onComplete={handleJobComplete} />
            </div>
          )
        }
      >
        {resultImage ? (
          <MaskCanvas
            imageUrl={resultImage}
            onExportMask={setMaskDataUrl}
          />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-muted/30">
            <ImageIcon className="h-12 w-12 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              Describe your environment and generate an image to get started
            </p>
          </div>
        )}
      </StageLayout>
    </StageGate>
  );
}
