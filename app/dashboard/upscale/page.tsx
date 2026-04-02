"use client";

import { useState, useCallback } from "react";
import { ImageUpload } from "@/components/image-upload";
import { ResultViewer } from "@/components/result-viewer";
import { JobStatus } from "@/components/job-status";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useFileUpload, useImagePreview } from "@/lib/hooks";
import { ZoomIn } from "lucide-react";
import type { Job } from "@/types";

export default function UpscalePage() {
  const [resolution, setResolution] = useState<"2x" | "4x">("2x");
  const [detailPrompt, setDetailPrompt] = useState("");
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const { upload, uploading } = useFileUpload();
  const { preview, createPreview, clearPreview } = useImagePreview();

  const handleUpload = useCallback(async (file: File) => {
    createPreview(file);
    const result = await upload(file);
    setImagePath(result.path);
  }, [upload, createPreview]);

  const handleRemove = useCallback(() => {
    clearPreview();
    setImagePath(null);
    setResultUrl(null);
    setJobId(null);
  }, [clearPreview]);

  const handleGenerate = useCallback(async () => {
    if (!imagePath) return;
    setProcessing(true);
    setResultUrl(null);

    try {
      const res = await fetch("/api/upscale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imagePath, resolution, detailPrompt }),
      });

      const job = await res.json();
      setJobId(job.id);
    } catch {
      setProcessing(false);
    }
  }, [imagePath, resolution, detailPrompt]);

  const handleJobComplete = useCallback((job: Job) => {
    setProcessing(false);
    if (job.result_image) {
      setResultUrl(job.result_image);
    }
  }, []);

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-medium">
          <ZoomIn className="h-5 w-5" />
          High-Fidelity Upscaling
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enhance image resolution and add fine details like pores, textures, and fabric grain.
        </p>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[1fr,320px]">
        <div className="space-y-3">
          {resultUrl && preview ? (
            <ResultViewer originalUrl={preview} resultUrl={resultUrl} />
          ) : (
            <ImageUpload
              onUpload={handleUpload}
              onRemove={handleRemove}
              preview={preview}
              label="Drop an image to upscale"
              description="JPEG, PNG, or WebP"
              className="min-h-64"
            />
          )}
          <JobStatus jobId={jobId} onComplete={handleJobComplete} />
        </div>

        <div className="space-y-4 rounded-lg border border-border p-5">
          <div>
            <Label className="text-sm font-medium">Resolution</Label>
            <RadioGroup
              value={resolution}
              onValueChange={(v) => setResolution(v as "2x" | "4x")}
              className="mt-2 flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="2x" id="2x" />
                <Label htmlFor="2x" className="cursor-pointer">2x</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="4x" id="4x" />
                <Label htmlFor="4x" className="cursor-pointer">4x</Label>
              </div>
            </RadioGroup>
          </div>

          <div>
            <Label htmlFor="detail" className="text-sm font-medium">
              Detail Enhancement
            </Label>
            <Input
              id="detail"
              placeholder="e.g., enhance skin pores and fabric texture"
              value={detailPrompt}
              onChange={(e) => setDetailPrompt(e.target.value)}
              className="mt-1.5"
            />
          </div>

          <Button
            size="lg"
            className="w-full"
            onClick={handleGenerate}
            disabled={!imagePath || uploading || processing}
          >
            {uploading ? "Uploading..." : processing ? "Processing..." : "Upscale Image"}
          </Button>

          {resultUrl && (
            <Button variant="ghost" size="sm" className="w-full" onClick={handleRemove}>
              Start Over
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
