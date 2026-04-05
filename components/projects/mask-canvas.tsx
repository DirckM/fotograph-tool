"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { ReactSketchCanvas } from "react-sketch-canvas";
import { Undo2, Redo2, Eraser } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

interface MaskCanvasProps {
  imageUrl: string;
  onExportMask: (maskDataUrl: string) => void;
  className?: string;
}

export function MaskCanvas({ imageUrl, onExportMask, className }: MaskCanvasProps) {
  const canvasRef = useRef<any>(null);
  const [brushSize, setBrushSize] = useState(20);
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);

  useEffect(() => {
    const img = new window.Image();
    img.onload = () => setAspectRatio(img.naturalWidth / img.naturalHeight);
    img.src = imageUrl;
  }, [imageUrl]);

  const handleUndo = useCallback(() => {
    canvasRef.current?.undo();
  }, []);

  const handleRedo = useCallback(() => {
    canvasRef.current?.redo();
  }, []);

  const handleClear = useCallback(() => {
    canvasRef.current?.clearCanvas();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          canvasRef.current?.redo();
        } else {
          canvasRef.current?.undo();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const exportTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const exportMask = useCallback(async () => {
    if (!canvasRef.current) return;
    const dataUrl = await canvasRef.current.exportImage("png");
    onExportMask(dataUrl);
  }, [onExportMask]);

  const handleStrokeEnd = useCallback(() => {
    if (exportTimerRef.current) clearTimeout(exportTimerRef.current);
    exportTimerRef.current = setTimeout(() => exportMask(), 300);
  }, [exportMask]);

  return (
    <div className={cn("flex h-full min-h-0 flex-col gap-2", className)}>
      <div className="flex shrink-0 flex-wrap items-center gap-3">
        <div className="flex items-center gap-2.5">
          <div
            className="shrink-0 rounded-full bg-white"
            style={{
              width: Math.min(brushSize, 24),
              height: Math.min(brushSize, 24),
              transition: "width 100ms ease, height 100ms ease",
            }}
          />
          <Slider
            min={1}
            max={50}
            value={[brushSize]}
            onValueChange={(val) => setBrushSize(Array.isArray(val) ? val[0] : val)}
            className="w-40"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="icon" onClick={handleUndo} title="Undo">
            <Undo2 />
          </Button>
          <Button variant="outline" size="icon" onClick={handleRedo} title="Redo">
            <Redo2 />
          </Button>
          <Button variant="outline" size="icon" onClick={handleClear} title="Clear">
            <Eraser />
          </Button>
        </div>
      </div>

      {aspectRatio !== null ? (
        <div
          className="relative min-h-0 flex-1 overflow-hidden rounded-lg border border-border"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt=""
            className="h-full w-full object-contain"
          />
          <ReactSketchCanvas
            ref={canvasRef}
            strokeWidth={brushSize}
            strokeColor="rgba(255,255,255,0.9)"
            canvasColor="transparent"
            exportWithBackgroundImage={false}
            onStroke={handleStrokeEnd}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", background: "transparent" }}
          />
        </div>
      ) : (
        <div className="flex h-64 items-center justify-center rounded-lg border border-border">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}
    </div>
  );
}
