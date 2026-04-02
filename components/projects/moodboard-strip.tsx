"use client";

import { cn } from "@/lib/utils";

interface MoodboardStripProps {
  images: Array<{ id: string; url: string; selected: boolean }>;
  maxVisible?: number;
  className?: string;
}

export function MoodboardStrip({
  images,
  maxVisible = 8,
  className,
}: MoodboardStripProps) {
  if (images.length === 0) return null;

  const visible = images.slice(0, maxVisible);
  const overflow = images.length - maxVisible;

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      {visible.map((img, index) => (
        <div
          key={img.id}
          className={cn(
            "relative h-12 w-12 shrink-0 overflow-hidden rounded-md border-2 transition-transform duration-150 hover:scale-105",
            img.selected ? "border-blue-500" : "border-border"
          )}
          style={{ animationDelay: `${index * 30}ms` }}
        >
          <img
            src={img.url}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>
      ))}

      {overflow > 0 && (
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-border bg-muted text-xs font-medium text-muted-foreground">
          +{overflow}
        </div>
      )}
    </div>
  );
}
