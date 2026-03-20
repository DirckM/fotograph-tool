"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { ReactSketchCanvas } from "react-sketch-canvas";
import { Undo2, Redo2, Eraser, Download } from "lucide-react";
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
    img.onload = () => {
      setAspectRatio(img.naturalWidth / img.naturalHeight);
    };
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

  const exportMask = useCallback(async () => {
    if (!canvasRef.current) return;
    const dataUrl = await canvasRef.current.exportImage("png");
    onExportMask(dataUrl);
  }, [onExportMask]);

  const handleStrokeEnd = useCallback(() => {
    exportMask();
  }, [exportMask]);

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            Brush: {brushSize}px
          </span>
          <Slider
            min={1}
            max={50}
            value={[brushSize]}
            onValueChange={(val: number[]) => setBrushSize(val[0])}
            className="w-32"
          />
        </div>

        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon-sm" onClick={handleUndo} title="Undo">
            <Undo2 />
          </Button>
          <Button variant="outline" size="icon-sm" onClick={handleRedo} title="Redo">
            <Redo2 />
          </Button>
          <Button variant="outline" size="icon-sm" onClick={handleClear} title="Clear">
            <Eraser />
          </Button>
        </div>

        <Button variant="secondary" size="sm" onClick={exportMask}>
          <Download data-icon="inline-start" />
          Export Mask
        </Button>
      </div>

      <div
        className="relative w-full overflow-hidden rounded-lg border border-border"
        style={aspectRatio ? { aspectRatio: `${aspectRatio}` } : undefined}
      >
        <ReactSketchCanvas
          ref={canvasRef}
          strokeWidth={brushSize}
          strokeColor="white"
          canvasColor="black"
          backgroundImage={imageUrl}
          exportWithBackgroundImage={false}
          onStroke={handleStrokeEnd}
          style={{ width: "100%", height: "100%" }}
        />
      </div>
    </div>
  );
}
