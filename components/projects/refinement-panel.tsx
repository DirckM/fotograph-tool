"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import { Loader2, Check, Wand2, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ImageLightbox } from "@/components/ui/image-lightbox";
import { cn } from "@/lib/utils";
import { DisabledTooltip } from "@/components/ui/disabled-tooltip";
import { MaskCanvas } from "./mask-canvas";

interface RefinementControlsProps {
  onRefine: (data: {
    prompt: string;
    maskDataUrl: string;
    referenceImagePaths?: string[];
  }) => void;
  referenceImages?: Array<{ id: string; url: string }>;
  isProcessing?: boolean;
  maskDataUrl: string | null;
}

export function RefinementControls({
  onRefine,
  referenceImages,
  isProcessing = false,
  maskDataUrl,
}: RefinementControlsProps) {
  const [prompt, setPrompt] = useState("");
  const [selectedRefs, setSelectedRefs] = useState<Set<string>>(new Set());

  const toggleReference = useCallback((id: string) => {
    setSelectedRefs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleRefine = useCallback(() => {
    if (!maskDataUrl || !prompt.trim()) return;

    const selectedUrls =
      referenceImages
        ?.filter((img) => selectedRefs.has(img.id))
        .map((img) => img.url) ?? [];

    onRefine({
      prompt: prompt.trim(),
      maskDataUrl,
      referenceImagePaths: selectedUrls.length > 0 ? selectedUrls : undefined,
    });
  }, [maskDataUrl, prompt, referenceImages, selectedRefs, onRefine]);

  const canSubmit = !!maskDataUrl && prompt.trim().length > 0 && !isProcessing;

  const disabledReason = !isProcessing
    ? [
        !maskDataUrl && "Paint a mask on the image",
        !prompt.trim() && "Enter a refinement description",
      ].filter(Boolean).join(" and ") || undefined
    : undefined;

  return (
    <div className="flex flex-col gap-4">
      <Textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Describe what should change in the masked area..."
        rows={3}
        disabled={isProcessing}
      />

      {referenceImages && referenceImages.length > 0 && (
        <div className="space-y-2">
          <span className="text-xs font-medium text-muted-foreground">
            Reference images
          </span>
          <div className="grid grid-cols-3 gap-2">
            {referenceImages.map((img) => {
              const isSelected = selectedRefs.has(img.id);
              return (
                <div
                  key={img.id}
                  className={cn(
                    "group relative aspect-square overflow-hidden rounded-md border-2 transition-colors duration-150",
                    isSelected ? "border-blue-500" : "border-transparent hover:border-muted-foreground/30"
                  )}
                >
                  <button
                    type="button"
                    onClick={() => toggleReference(img.id)}
                    disabled={isProcessing}
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
                      <div className="absolute inset-0 flex items-center justify-center bg-blue-500/30">
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
              );
            })}
          </div>
        </div>
      )}

      <DisabledTooltip message={!canSubmit ? disabledReason : undefined}>
        <Button
          onClick={handleRefine}
          disabled={!canSubmit}
          className="w-full"
          size="lg"
        >
          {isProcessing ? (
            <>
              <Loader2 className="animate-spin" data-icon="inline-start" />
              Processing...
            </>
          ) : (
            <>
              <Wand2 data-icon="inline-start" />
              Refine
            </>
          )}
        </Button>
      </DisabledTooltip>
    </div>
  );
}

interface RefinementPanelProps {
  imageUrl: string;
  onRefine: (data: {
    prompt: string;
    maskDataUrl: string;
    referenceImagePaths?: string[];
  }) => void;
  referenceImages?: Array<{ id: string; url: string }>;
  isProcessing?: boolean;
  className?: string;
}

export function RefinementPanel({
  imageUrl,
  onRefine,
  referenceImages,
  isProcessing = false,
  className,
}: RefinementPanelProps) {
  const [maskDataUrl, setMaskDataUrl] = useState<string | null>(null);

  return (
    <div
      className={cn(
        "grid gap-6 md:grid-cols-[1fr_minmax(280px,360px)]",
        className
      )}
    >
      <MaskCanvas imageUrl={imageUrl} onExportMask={setMaskDataUrl} />

      <RefinementControls
        onRefine={onRefine}
        referenceImages={referenceImages}
        isProcessing={isProcessing}
        maskDataUrl={maskDataUrl}
      />
    </div>
  );
}
