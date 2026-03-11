"use client";

import { useState, useRef, useCallback } from "react";
import { Download, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

interface ResultViewerProps {
  originalUrl: string;
  resultUrl: string;
  className?: string;
}

export function ResultViewer({
  originalUrl,
  resultUrl,
  className,
}: ResultViewerProps) {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleDownload = useCallback(async () => {
    const response = await fetch(resultUrl);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fotograph-result-${Date.now()}.png`;
    a.click();
    URL.revokeObjectURL(url);
  }, [resultUrl]);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!isFullscreen) {
      containerRef.current.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
    setIsFullscreen(!isFullscreen);
  }, [isFullscreen]);

  return (
    <div className={cn("space-y-3", className)}>
      <div
        ref={containerRef}
        className="relative overflow-hidden rounded-lg border border-border bg-muted"
        style={{ aspectRatio: "16/10" }}
      >
        <img
          src={originalUrl}
          alt="Original"
          className="absolute inset-0 h-full w-full object-contain"
        />

        <div
          className="absolute inset-0 overflow-hidden"
          style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
        >
          <img
            src={resultUrl}
            alt="Result"
            className="h-full w-full object-contain"
          />
        </div>

        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg"
          style={{ left: `${sliderPosition}%` }}
        >
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white p-1 shadow-md">
            <div className="h-4 w-4 rounded-full bg-primary" />
          </div>
        </div>

        <div className="absolute left-3 top-3 rounded bg-black/60 px-2 py-0.5 text-xs text-white">
          Result
        </div>
        <div className="absolute right-3 top-3 rounded bg-black/60 px-2 py-0.5 text-xs text-white">
          Original
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Slider
          value={[sliderPosition]}
          onValueChange={(v) => setSliderPosition(Array.isArray(v) ? v[0] : v)}
          min={0}
          max={100}
          step={1}
          className="flex-1"
        />
        <Button variant="outline" size="icon" onClick={toggleFullscreen}>
          {isFullscreen ? (
            <Minimize2 className="h-4 w-4" />
          ) : (
            <Maximize2 className="h-4 w-4" />
          )}
        </Button>
        <Button variant="outline" size="icon" onClick={handleDownload}>
          <Download className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
