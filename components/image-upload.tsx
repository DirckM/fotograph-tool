"use client";

import { useCallback, useState } from "react";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface ImageUploadProps {
  onUpload: (file: File) => void;
  onRemove?: () => void;
  preview?: string | null;
  label?: string;
  description?: string;
  className?: string;
  accept?: string;
  multiple?: boolean;
}

export function ImageUpload({
  onUpload,
  onRemove,
  preview,
  label = "Upload image",
  description = "Drag and drop or click to browse",
  className,
  accept = "image/jpeg,image/png,image/webp",
  multiple = false,
}: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const files = Array.from(e.dataTransfer.files).filter((f) =>
        f.type.startsWith("image/")
      );
      if (multiple) {
        files.forEach((file) => onUpload(file));
      } else if (files[0]) {
        onUpload(files[0]);
      }
    },
    [onUpload, multiple]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      if (multiple) {
        files.forEach((file) => onUpload(file));
      } else if (files[0]) {
        onUpload(files[0]);
      }
      e.target.value = "";
    },
    [onUpload, multiple]
  );

  if (preview) {
    return (
      <div className={cn("relative overflow-hidden rounded-lg border border-border", className)}>
        <img
          src={preview}
          alt="Upload preview"
          className="h-full w-full object-cover"
        />
        {onRemove && (
          <Button
            variant="secondary"
            size="icon"
            className="absolute right-2 top-2 h-7 w-7"
            onClick={onRemove}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <label
      className={cn(
        "flex h-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border transition-colors",
        isDragging && "border-primary bg-primary/5",
        !isDragging && "hover:border-muted-foreground/50 hover:bg-muted/50",
        className
      )}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      <input
        type="file"
        className="hidden"
        accept={accept}
        multiple={multiple}
        onChange={handleChange}
      />
      <div className="flex flex-col items-center gap-2 p-6">
        {isDragging ? (
          <ImageIcon className="h-6 w-6 text-primary" />
        ) : (
          <Upload className="h-6 w-6 text-muted-foreground" />
        )}
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </label>
  );
}
