"use client";

import { useState, useCallback, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ImageUpload } from "@/components/image-upload";
import { ResultViewer } from "@/components/result-viewer";
import { JobStatus } from "@/components/job-status";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useFileUpload } from "@/lib/hooks";
import { Wand2 } from "lucide-react";
import type { Job } from "@/types";

export default function AdjustPage() {
  return (
    <Suspense>
      <AdjustPageInner />
    </Suspense>
  );
}

function AdjustPageInner() {
  const searchParams = useSearchParams();
  const [userPrompt, setUserPrompt] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const { upload, uploading } = useFileUpload();

  useEffect(() => {
    const imageUrl = searchParams.get("imageUrl");
    if (imageUrl) {
      setPreview(imageUrl);
      setImagePath(imageUrl);
    }
  }, [searchParams]);

  const handleUpload = useCallback(async (file: File) => {
    const url = URL.createObjectURL(file);
    setPreview(url);
    const result = await upload(file);
    setImagePath(result.path);
  }, [upload]);

  const handleRemove = useCallback(() => {
    if (preview && !preview.startsWith("https://")) {
      URL.revokeObjectURL(preview);
    }
    setPreview(null);
    setImagePath(null);
    setResultUrl(null);
    setJobId(null);
  }, [preview]);

  const handleGenerate = useCallback(async () => {
    if (!imagePath || !userPrompt.trim()) return;
    setProcessing(true);
    setResultUrl(null);

    try {
      const res = await fetch("/api/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imagePath, userPrompt: userPrompt.trim() }),
      });
      const job = await res.json();
      setJobId(job.id);
    } catch {
      setProcessing(false);
    }
  }, [imagePath, userPrompt]);

  const handleJobComplete = useCallback((job: Job) => {
    setProcessing(false);
    if (job.result_image) setResultUrl(job.result_image);
  }, []);

  const handleStartOver = useCallback(() => {
    handleRemove();
    setUserPrompt("");
    setResultUrl(null);
    setJobId(null);
  }, [handleRemove]);

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-medium">
          <Wand2 className="h-5 w-5" />
          Image Adjust
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Make targeted edits to an image using a text description of what to change.
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
              label="Drop an image to adjust"
              description="JPEG, PNG, or WebP"
              className="min-h-64"
            />
          )}
          <JobStatus jobId={jobId} onComplete={handleJobComplete} />
        </div>

        <div className="space-y-4 rounded-lg border border-border p-5">
          <div>
            <Label className="text-sm font-medium">Adjustment</Label>
            <Textarea
              className="mt-1.5 resize-none"
              rows={5}
              placeholder="Describe what you want to change, e.g. 'change the jacket color to red' or 'remove the logo from the shirt'"
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
            />
          </div>

          <Button
            size="lg"
            className="w-full"
            onClick={handleGenerate}
            disabled={!imagePath || !userPrompt.trim() || uploading || processing}
          >
            {uploading ? "Uploading..." : processing ? "Processing..." : "Apply Adjustment"}
          </Button>

          {(resultUrl || imagePath) && (
            <Button variant="ghost" size="sm" className="w-full" onClick={handleStartOver}>
              Start Over
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
