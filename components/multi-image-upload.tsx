"use client";

import { useCallback, useState } from "react";
import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { QualityIndicator } from "@/components/quality-indicator";
import { ImageLightbox } from "@/components/ui/image-lightbox";
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
  const [draggingOver, setDraggingOver] = useState<number | null>(null);

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

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDraggingOver(null);
      const files = Array.from(e.dataTransfer.files).filter((f) =>
        f.type.startsWith("image/")
      );
      files.forEach((file) => onAdd(file));
    },
    [onAdd]
  );

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDraggingOver(index);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDraggingOver(null);
  }, []);

  return (
    <div className={cn("space-y-3", className)}>
      <div className="grid grid-cols-5 gap-2">
        {Array.from({ length: maxImages }).map((_, i) => {
          const image = images[i];
          const suggestion = QUALITY_LEVELS[i]?.suggestion ?? "";
          const isDragTarget = draggingOver === i;

          if (image) {
            return (
              <div
                key={i}
                className="relative aspect-square overflow-hidden rounded-lg border border-border"
              >
                <ImageLightbox src={image.preview} alt={`Reference ${i + 1}`} className="h-full w-full">
                  <img
                    src={image.preview}
                    alt={`Reference ${i + 1}`}
                    className="h-full w-full object-contain"
                  />
                </ImageLightbox>
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

          // Empty squares accept drag-and-drop
          return (
            <label
              key={i}
              className={cn(
                "flex aspect-square cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors",
                isDragTarget
                  ? "border-primary bg-primary/10"
                  : i === images.length
                    ? "border-border hover:border-muted-foreground/50 hover:bg-muted/50"
                    : "border-border/50"
              )}
              onDragOver={(e) => handleDragOver(e, i)}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input
                type="file"
                className="hidden"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleChange}
              />
              <Plus className={cn("h-5 w-5", isDragTarget ? "text-primary" : "text-muted-foreground")} />
              <span className={cn("mt-1 text-[10px]", isDragTarget ? "text-primary" : "text-muted-foreground/50")}>
                {suggestion}
              </span>
            </label>
          );
        })}
      </div>

      {showQualityIndicator && (
        <QualityIndicator count={images.length} maxCount={maxImages} />
      )}
    </div>
  );
}
