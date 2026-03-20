"use client";

import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MoodboardImage {
  id: string;
  url: string;
  selected: boolean;
}

interface MoodboardGridProps {
  images: MoodboardImage[];
  onToggleSelect: (id: string) => void;
  onRemove: (id: string) => void;
  className?: string;
}

export function MoodboardGrid({
  images,
  onToggleSelect,
  onRemove,
  className,
}: MoodboardGridProps) {
  if (images.length === 0) {
    return (
      <div className={cn("py-12 text-center", className)}>
        <p className="text-sm text-muted-foreground">
          No moodboard images yet. Search Pinterest or upload your own.
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-3 md:grid-cols-4",
        className
      )}
    >
      {images.map((image) => (
        <div
          key={image.id}
          className={cn(
            "group relative overflow-hidden rounded-lg border-2 transition-colors",
            image.selected
              ? "border-blue-500 ring-2 ring-blue-500/30"
              : "border-transparent"
          )}
        >
          <img
            src={image.url}
            alt="Moodboard image"
            className="aspect-square w-full object-cover"
            loading="lazy"
          />

          <button
            type="button"
            onClick={() => onToggleSelect(image.id)}
            className={cn(
              "absolute left-2 top-2 flex size-6 items-center justify-center rounded-full border-2 transition-colors",
              image.selected
                ? "border-blue-500 bg-blue-500 text-white"
                : "border-white bg-black/30 text-transparent hover:border-blue-400 hover:bg-blue-400/30 hover:text-white"
            )}
          >
            <Check className="size-3.5" />
          </button>

          <Button
            size="icon-xs"
            variant="secondary"
            className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100"
            onClick={() => onRemove(image.id)}
          >
            <X />
          </Button>
        </div>
      ))}
    </div>
  );
}
