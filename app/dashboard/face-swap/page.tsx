"use client";

import { useState, useCallback } from "react";
import { ImageUpload } from "@/components/image-upload";
import { MultiImageUpload } from "@/components/multi-image-upload";
import { ResultViewer } from "@/components/result-viewer";
import { JobStatus } from "@/components/job-status";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFileUpload, useImagePreview } from "@/lib/hooks";
import { Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Job } from "@/types";

interface UploadedImage {
  file?: File;
  preview: string;
  path?: string;
}

const PERSPECTIVE_ANGLES = [
  { value: "front three-quarter left", label: "3/4 Left" },
  { value: "front three-quarter right", label: "3/4 Right" },
  { value: "left profile", label: "Left Profile" },
  { value: "right profile", label: "Right Profile" },
  { value: "slight upward angle", label: "Slightly Up" },
  { value: "slight downward angle", label: "Slightly Down" },
];

const LOOK_DIRECTIONS = [
  { value: "same", label: "Same as original" },
  { value: "towards the camera", label: "Towards camera" },
  { value: "slightly to the left", label: "Slightly left" },
  { value: "slightly to the right", label: "Slightly right" },
  { value: "slightly upward", label: "Slightly up" },
  { value: "slightly downward", label: "Slightly down" },
];

const CLOTHING_TEXTURES = [
  { value: "", label: "No change" },
  { value: "fabric", label: "More fabric detail" },
  { value: "denim", label: "Denim texture" },
  { value: "leather", label: "Leather texture" },
  { value: "silk", label: "Silk texture" },
  { value: "wool", label: "Wool texture" },
  { value: "knit", label: "Knit texture" },
];

export default function FaceSwapPage() {
  const [targetPath, setTargetPath] = useState<string | null>(null);
  const [sourceImages, setSourceImages] = useState<UploadedImage[]>([]);
  const [sourceMode, setSourceMode] = useState<"upload" | "generate">("upload");

  // Perspective generation state
  const [perspAngle, setPerspAngle] = useState("front three-quarter left");
  const [perspPath, setPerspPath] = useState<string | null>(null);
  const [perspJobId, setPerspJobId] = useState<string | null>(null);
  const [perspGenerating, setPerspGenerating] = useState(false);

  // Optional controls
  const [lookDirection, setLookDirection] = useState("same");
  const [clothingTexture, setClothingTexture] = useState("");

  // Face swap state
  const [jobId, setJobId] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const { upload, uploading } = useFileUpload();
  const {
    preview: targetPreview,
    createPreview: createTargetPreview,
    clearPreview: clearTargetPreview,
  } = useImagePreview();
  const {
    preview: perspPreview,
    createPreview: createPerspPreview,
    clearPreview: clearPerspPreview,
  } = useImagePreview();

  const handleTargetUpload = useCallback(async (file: File) => {
    createTargetPreview(file);
    const result = await upload(file);
    setTargetPath(result.path);
  }, [upload, createTargetPreview]);

  const handleTargetRemove = useCallback(() => {
    clearTargetPreview();
    setTargetPath(null);
    setResultUrl(null);
    setJobId(null);
  }, [clearTargetPreview]);

  const handleSourceAdd = useCallback(async (file: File) => {
    const preview = URL.createObjectURL(file);
    const newImage: UploadedImage = { file, preview };
    setSourceImages((prev) => [...prev, newImage]);
    const result = await upload(file);
    setSourceImages((prev) =>
      prev.map((img) => img.file === file ? { ...img, path: result.path } : img)
    );
  }, [upload]);

  const handleSourceRemove = useCallback((index: number) => {
    setSourceImages((prev) => {
      const img = prev[index];
      if (img?.preview && img.file) URL.revokeObjectURL(img.preview);
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const handlePerspUpload = useCallback(async (file: File) => {
    createPerspPreview(file);
    const result = await upload(file);
    setPerspPath(result.path);
  }, [upload, createPerspPreview]);

  const handlePerspRemove = useCallback(() => {
    clearPerspPreview();
    setPerspPath(null);
    setPerspJobId(null);
  }, [clearPerspPreview]);

  const handleGeneratePerspective = useCallback(async () => {
    if (!perspPath) return;
    setPerspGenerating(true);
    try {
      const res = await fetch("/api/generate-perspective", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imagePath: perspPath, angle: perspAngle }),
      });
      const job = await res.json();
      setPerspJobId(job.id);
    } catch {
      setPerspGenerating(false);
    }
  }, [perspPath, perspAngle]);

  const handlePerspJobComplete = useCallback((job: Job) => {
    setPerspGenerating(false);
    if (job.result_image) {
      setSourceImages((prev) => [
        ...prev,
        { preview: job.result_image!, path: job.result_image! },
      ]);
    }
    setPerspJobId(null);
    clearPerspPreview();
    setPerspPath(null);
  }, [clearPerspPreview]);

  const handleGenerate = useCallback(async () => {
    if (!targetPath) return;
    const sourcePaths = sourceImages.map((img) => img.path).filter(Boolean) as string[];
    if (sourcePaths.length === 0) return;

    setProcessing(true);
    setResultUrl(null);

    try {
      const res = await fetch("/api/face-swap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetImagePath: targetPath,
          sourceImagePaths: sourcePaths,
          lookDirection: lookDirection !== "same" ? lookDirection : undefined,
          clothingTexture: clothingTexture || undefined,
        }),
      });
      const job = await res.json();
      setJobId(job.id);
    } catch {
      setProcessing(false);
    }
  }, [targetPath, sourceImages, lookDirection, clothingTexture]);

  const handleJobComplete = useCallback((job: Job) => {
    setProcessing(false);
    if (job.result_image) setResultUrl(job.result_image);
  }, []);

  const handleStartOver = useCallback(() => {
    handleTargetRemove();
    setSourceImages((prev) => {
      prev.forEach((img) => { if (img.preview && img.file) URL.revokeObjectURL(img.preview); });
      return [];
    });
    clearPerspPreview();
    setPerspPath(null);
    setPerspJobId(null);
    setLookDirection("same");
    setClothingTexture("");
  }, [handleTargetRemove, clearPerspPreview]);

  const allSourcesUploaded = sourceImages.length > 0 && sourceImages.every((img) => img.path);

  return (
    <div className="flex h-full flex-col gap-3 p-6 lg:p-8">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-medium">
          <Users className="h-5 w-5" />
          Face Swap
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Replace a face in a target image. Upload reference photos or generate missing perspective angles.
        </p>
      </div>

      <div className="grid flex-1 min-h-0 items-stretch gap-4 lg:grid-cols-[1fr,280px]">
        {/* Yellow: image upload fills available height */}
        <div className="flex flex-col gap-2 min-h-0">
          {resultUrl && targetPreview ? (
            <ResultViewer originalUrl={targetPreview} resultUrl={resultUrl} />
          ) : (
            <ImageUpload
              onUpload={handleTargetUpload}
              onRemove={handleTargetRemove}
              preview={targetPreview}
              label="Upload target photo"
              description="The photo where the face will be replaced"
              className="flex-1 min-h-0"
            />
          )}
          {/* Blue: job status below upload */}
          <JobStatus jobId={jobId} onComplete={handleJobComplete} />
        </div>

        {/* Red: all configuration in sidebar, scrollable if needed */}
        <div className="flex flex-col gap-3 overflow-y-auto rounded-lg border border-border p-3">
          {/* Source face section */}
          <div>
            <Label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">Source Face</Label>
            <div className="mb-2 flex rounded-md border border-border text-sm">
              <button
                className={cn(
                  "flex-1 rounded-l-md px-3 py-1.5 font-medium transition-colors",
                  sourceMode === "upload"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => setSourceMode("upload")}
              >
                Upload
              </button>
              <button
                className={cn(
                  "flex-1 rounded-r-md px-3 py-1.5 font-medium transition-colors",
                  sourceMode === "generate"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => setSourceMode("generate")}
              >
                Generate angle
              </button>
            </div>

            {sourceMode === "upload" ? (
              <MultiImageUpload
                images={sourceImages}
                onAdd={handleSourceAdd}
                onRemove={handleSourceRemove}
                maxImages={5}
              />
            ) : (
              <div className="space-y-3">
                <ImageUpload
                  onUpload={handlePerspUpload}
                  onRemove={handlePerspRemove}
                  preview={perspPreview}
                  label="Face reference"
                  description="Any existing angle"
                  className="min-h-28"
                />
                <Select value={perspAngle} onValueChange={(v) => v && setPerspAngle(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Angle to generate" />
                  </SelectTrigger>
                  <SelectContent>
                    {PERSPECTIVE_ANGLES.map((a) => (
                      <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={handleGeneratePerspective}
                  disabled={!perspPath || uploading || perspGenerating}
                >
                  {perspGenerating ? "Generating..." : "Generate perspective"}
                </Button>
                {perspJobId && (
                  <JobStatus jobId={perspJobId} onComplete={handlePerspJobComplete} />
                )}
              </div>
            )}
          </div>

          {/* Generated/added images preview when in generate mode */}
          {sourceImages.length > 0 && sourceMode === "generate" && (
            <div>
              <Label className="mb-2 block text-xs text-muted-foreground">
                Added references ({sourceImages.length})
              </Label>
              <div className="flex flex-wrap gap-2">
                {sourceImages.map((img, i) => (
                  <div key={i} className="relative">
                    <img src={img.preview} alt="" className="h-12 w-12 rounded-md object-cover" />
                    <button
                      className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] text-destructive-foreground"
                      onClick={() => handleSourceRemove(i)}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Optional controls */}
          <div className="space-y-3 border-t border-border pt-4">
            <p className="text-xs font-medium text-muted-foreground">Optional adjustments</p>

            <div>
              <Label className="mb-1.5 block text-sm">Look direction</Label>
              <Select value={lookDirection} onValueChange={(v) => v && setLookDirection(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LOOK_DIRECTIONS.map((d) => (
                    <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="mb-1.5 block text-sm">Clothing texture</Label>
              <Select value={clothingTexture} onValueChange={(v) => v && setClothingTexture(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="No change" />
                </SelectTrigger>
                <SelectContent>
                  {CLOTHING_TEXTURES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            size="lg"
            className="w-full"
            onClick={handleGenerate}
            disabled={!targetPath || !allSourcesUploaded || uploading || processing}
          >
            {uploading ? "Uploading..." : processing ? "Processing..." : "Swap Face"}
          </Button>

          {resultUrl && (
            <Button variant="ghost" size="sm" className="w-full" onClick={handleStartOver}>
              Start Over
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
