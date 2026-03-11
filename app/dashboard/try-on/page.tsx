"use client";

import { useState, useCallback } from "react";
import { ImageUpload } from "@/components/image-upload";
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
import { Textarea } from "@/components/ui/textarea";
import { useFileUpload, useImagePreview } from "@/lib/hooks";
import { Shirt } from "lucide-react";
import type { Job } from "@/types";

const CLOTHING_TYPES = [
  { value: "top", label: "Top / Shirt" },
  { value: "bottom", label: "Bottom / Pants" },
  { value: "full outfit", label: "Full Outfit" },
  { value: "accessory", label: "Accessory" },
];

export default function TryOnPage() {
  const [clothingType, setClothingType] = useState("top");
  const [context, setContext] = useState("");
  const [clothingPath, setClothingPath] = useState<string | null>(null);
  const [personPath, setPersonPath] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const { upload, uploading } = useFileUpload();
  const {
    preview: clothingPreview,
    createPreview: createClothingPreview,
    clearPreview: clearClothingPreview,
  } = useImagePreview();
  const {
    preview: personPreview,
    createPreview: createPersonPreview,
    clearPreview: clearPersonPreview,
  } = useImagePreview();

  const handleClothingUpload = useCallback(async (file: File) => {
    createClothingPreview(file);
    const result = await upload(file);
    setClothingPath(result.path);
  }, [upload, createClothingPreview]);

  const handlePersonUpload = useCallback(async (file: File) => {
    createPersonPreview(file);
    const result = await upload(file);
    setPersonPath(result.path);
  }, [upload, createPersonPreview]);

  const handleGenerate = useCallback(async () => {
    if (!clothingPath || !personPath) return;
    setProcessing(true);
    setResultUrl(null);

    try {
      const res = await fetch("/api/try-on", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clothingImagePath: clothingPath,
          personImagePath: personPath,
          clothingType,
          context: context.trim() || undefined,
        }),
      });

      const job = await res.json();
      setJobId(job.id);
    } catch {
      setProcessing(false);
    }
  }, [clothingPath, personPath, clothingType, context]);

  const handleJobComplete = useCallback((job: Job) => {
    setProcessing(false);
    if (job.result_image) {
      setResultUrl(job.result_image);
    }
  }, []);

  const handleStartOver = useCallback(() => {
    clearClothingPreview();
    clearPersonPreview();
    setClothingPath(null);
    setPersonPath(null);
    setContext("");
    setResultUrl(null);
    setJobId(null);
  }, [clearClothingPreview, clearPersonPreview]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-medium">
          <Shirt className="h-5 w-5" />
          Virtual <span className="font-serif">Try-On</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          See how clothing looks on a person. Upload the garment and the model separately.
        </p>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[1fr,320px]">
        <div className="space-y-3">
          {resultUrl && personPreview ? (
            <ResultViewer originalUrl={personPreview} resultUrl={resultUrl} />
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Clothing</label>
                <ImageUpload
                  onUpload={handleClothingUpload}
                  onRemove={() => {
                    clearClothingPreview();
                    setClothingPath(null);
                  }}
                  preview={clothingPreview}
                  label="Garment photo"
                  description="Flat-lay or product image"
                  className="min-h-48"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Person</label>
                <ImageUpload
                  onUpload={handlePersonUpload}
                  onRemove={() => {
                    clearPersonPreview();
                    setPersonPath(null);
                  }}
                  preview={personPreview}
                  label="Person photo"
                  description="The model to dress"
                  className="min-h-48"
                />
              </div>
            </div>
          )}
          <JobStatus jobId={jobId} onComplete={handleJobComplete} />
        </div>

        <div className="space-y-4 rounded-lg border border-border p-5">
          <div>
            <Label className="text-sm font-medium">Clothing Type</Label>
            <Select value={clothingType} onValueChange={(v) => { if (v) setClothingType(v); }}>
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CLOTHING_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm font-medium">Photo Context</Label>
            <Textarea
              className="mt-1.5 resize-none"
              rows={3}
              placeholder="Describe anything specific about the photo, e.g. 'two people in the photo, apply to the person on the left' or 'the garment should replace the jacket'"
              value={context}
              onChange={(e) => setContext(e.target.value)}
            />
          </div>

          <Button
            size="lg"
            className="w-full"
            onClick={handleGenerate}
            disabled={!clothingPath || !personPath || uploading || processing}
          >
            {uploading ? "Uploading..." : processing ? "Processing..." : "Try On"}
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
