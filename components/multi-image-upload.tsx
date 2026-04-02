"use client";

import { useCallback } from "react";
import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { QualityIndicator } from "@/components/quality-indicator";
import { QUALITY_LEVELS } from "@/types";

interface UploadedImage {
  file?: File;
  preview: string;
}

interface MultiImageUploadProps {
  images: UploadedImage[];
  onAdd: (file: File) => void;
  onRemove: (index: number) => void;
  maxImages?: number;
  className?: string;
  showQualityIndicator?: boolean;
}

export function MultiImageUpload({
  images,
  onAdd,
  onRemove,
  maxImages = 5,
  className,
  showQualityIndicator = true,
}: MultiImageUploadProps) {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        onAdd(file);
      }
      e.target.value = "";
    },
    [onAdd]
  );

  return (
    <div className={cn("space-y-3", className)}>
      <div className="grid grid-cols-5 gap-2">
        {Array.from({ length: maxImages }).map((_, i) => {
          const image = images[i];
          const suggestion = QUALITY_LEVELS[i]?.suggestion ?? "";

          if (image) {
            return (
              <div
                key={i}
                className="relative aspect-square overflow-hidden rounded-lg border border-border"
              >
                <img
                  src={image.preview}
                  alt={`Reference ${i + 1}`}
                  className="h-full w-full object-cover"
                />
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute right-1 top-1 h-5 w-5"
                  onClick={() => onRemove(i)}
                >
                  <X className="h-3 w-3" />
                </Button>
                <span className="absolute bottom-0 left-0 right-0 bg-black/60 px-1 py-0.5 text-center text-[10px] text-white">
                  {suggestion}
                </span>
              </div>
            );
          }

          if (i === images.length) {
            return (
              <label
                key={i}
                className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border transition-colors hover:border-muted-foreground/50 hover:bg-muted/50"
              >
                <input
                  type="file"
                  className="hidden"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleChange}
                />
                <Plus className="h-5 w-5 text-muted-foreground" />
                <span className="mt-1 text-[10px] text-muted-foreground">
                  {suggestion}
                </span>
              </label>
            );
          }

          return (
            <div
              key={i}
              className="flex aspect-square flex-col items-center justify-center rounded-lg border border-dashed border-border/50"
            >
              <span className="text-[10px] text-muted-foreground/50">
                {suggestion}
              </span>
            </div>
          );
        })}
      </div>

      {showQualityIndicator && (
        <QualityIndicator count={images.length} maxCount={maxImages} />
      )}
    </div>
  );
}
