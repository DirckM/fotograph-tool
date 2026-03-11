"use client";

import { useState, useCallback } from "react";
import { MultiImageUpload } from "@/components/multi-image-upload";
import { JobStatus } from "@/components/job-status";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useFileUpload } from "@/lib/hooks";
import { UserCheck, Download } from "lucide-react";
import type { Job } from "@/types";

interface UploadedImage {
  file: File;
  preview: string;
  path?: string;
}

const STYLES = [
  { value: "photorealistic", label: "Photorealistic" },
  { value: "illustration", label: "Illustration" },
  { value: "3D render", label: "3D Render" },
];

export default function ConsistencyPage() {
  const [referenceImages, setReferenceImages] = useState<UploadedImage[]>([]);
  const [sceneDescription, setSceneDescription] = useState("");
  const [style, setStyle] = useState("photorealistic");
  const [jobId, setJobId] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const { upload, uploading } = useFileUpload();

  const handleAdd = useCallback(async (file: File) => {
    const preview = URL.createObjectURL(file);
    const newImage: UploadedImage = { file, preview };
    setReferenceImages((prev) => [...prev, newImage]);

    const result = await upload(file);
    setReferenceImages((prev) =>
      prev.map((img) =>
        img.file === file ? { ...img, path: result.path } : img
      )
    );
  }, [upload]);

  const handleRemove = useCallback((index: number) => {
    setReferenceImages((prev) => {
      const img = prev[index];
      if (img?.preview) URL.revokeObjectURL(img.preview);
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const handleGenerate = useCallback(async () => {
    const paths = referenceImages
      .map((img) => img.path)
      .filter(Boolean) as string[];
    if (paths.length === 0 || !sceneDescription) return;

    setProcessing(true);
    setResultUrl(null);

    try {
      const res = await fetch("/api/consistency", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          referenceImagePaths: paths,
          sceneDescription,
          style,
        }),
      });

      const job = await res.json();
      setJobId(job.id);
    } catch {
      setProcessing(false);
    }
  }, [referenceImages, sceneDescription, style]);

  const handleJobComplete = useCallback((job: Job) => {
    setProcessing(false);
    if (job.result_image) {
      setResultUrl(job.result_image);
    }
  }, []);

  const handleDownload = useCallback(async () => {
    if (!resultUrl) return;
    const response = await fetch(resultUrl);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fotograph-consistency-${Date.now()}.png`;
    a.click();
    URL.revokeObjectURL(url);
  }, [resultUrl]);

  const allRefsUploaded = referenceImages.length > 0 && referenceImages.every((img) => img.path);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-medium">
          <UserCheck className="h-5 w-5" />
          Character <span className="font-serif">Consistency</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Generate new images of the same character in different scenes while maintaining their identity.
        </p>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[1fr,360px]">
        <div className="space-y-3">
          <div>
            <label className="mb-2 block text-sm font-medium">Character References</label>
            <MultiImageUpload
              images={referenceImages}
              onAdd={handleAdd}
              onRemove={handleRemove}
              maxImages={5}
            />
          </div>

          {resultUrl && (
            <div className="space-y-3">
              <div className="overflow-hidden rounded-lg border border-border">
                <img
                  src={resultUrl}
                  alt="Generated result"
                  className="w-full object-contain"
                />
              </div>
              <Button variant="outline" size="lg" className="w-full" onClick={handleDownload}>
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
            </div>
          )}

          <JobStatus jobId={jobId} onComplete={handleJobComplete} />
        </div>

        <div className="space-y-4 rounded-lg border border-border p-5">
          <div>
            <Label htmlFor="scene" className="text-sm font-medium">
              Scene Description
            </Label>
            <Textarea
              id="scene"
              placeholder="Describe the new scene, pose, or context..."
              value={sceneDescription}
              onChange={(e) => setSceneDescription(e.target.value)}
              className="mt-1.5"
              rows={4}
            />
          </div>

          <div>
            <Label className="text-sm font-medium">Style</Label>
            <RadioGroup
              value={style}
              onValueChange={setStyle}
              className="mt-2 flex gap-4"
            >
              {STYLES.map((s) => (
                <div key={s.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={s.value} id={s.value} />
                  <Label htmlFor={s.value} className="cursor-pointer text-sm">
                    {s.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <Button
            size="lg"
            className="w-full"
            onClick={handleGenerate}
            disabled={!allRefsUploaded || !sceneDescription || uploading || processing}
          >
            {uploading ? "Uploading..." : processing ? "Processing..." : "Generate"}
          </Button>
        </div>
      </div>
    </div>
  );
}
