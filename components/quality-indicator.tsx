"use client";

import { QUALITY_LEVELS } from "@/types";
import { cn } from "@/lib/utils";

interface QualityIndicatorProps {
  count: number;
  maxCount?: number;
  className?: string;
}

export function QualityIndicator({
  count,
  maxCount = 5,
  className,
}: QualityIndicatorProps) {
  const currentLevel = QUALITY_LEVELS.find((l) => l.count === Math.min(count, maxCount))
    ?? QUALITY_LEVELS[0];
  const nextLevel = QUALITY_LEVELS.find((l) => l.count === count + 1);

  const colorForSegment = (index: number) => {
    if (index >= count) return "bg-muted";
    if (count <= 1) return "bg-red-500";
    if (count <= 2) return "bg-orange-500";
    if (count <= 3) return "bg-yellow-500";
    if (count <= 4) return "bg-green-500";
    return "bg-emerald-500";
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">
          Context Quality: {count > 0 ? currentLevel.label : "None"}
        </span>
        <span className="text-xs text-muted-foreground">
          {count}/{maxCount} photos
        </span>
      </div>

      <div className="flex gap-1">
        {Array.from({ length: maxCount }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-2 flex-1 rounded-full transition-colors",
              colorForSegment(i)
            )}
          />
        ))}
      </div>

      {nextLevel && count > 0 && (
        <p className="text-xs text-muted-foreground">
          Add a {nextLevel.suggestion} angle to improve quality
        </p>
      )}
      {count === 0 && (
        <p className="text-xs text-muted-foreground">
          Upload at least one photo to get started
        </p>
      )}
    </div>
  );
}
