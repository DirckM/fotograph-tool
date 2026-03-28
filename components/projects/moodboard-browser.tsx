"use client";

import { useState } from "react";
import { ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { MoodboardSearch } from "./moodboard-search";
import { MoodboardGrid } from "./moodboard-grid";
import { ImageUpload } from "@/components/image-upload";
import { Label } from "@/components/ui/label";

interface MoodboardImage {
  id: string;
  url: string;
  selected: boolean;
  note?: string;
}

interface MoodboardBrowserProps {
  images: MoodboardImage[];
  onAddFromPinterest: (imageUrl: string, description: string) => void;
  onUpload: (file: File) => void;
  onToggleSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onNoteChange?: (id: string, note: string) => void;
  projectDescription?: string;
  uploading?: boolean;
}

export function MoodboardBrowser({
  images,
  onAddFromPinterest,
  onUpload,
  onToggleSelect,
  onRemove,
  onNoteChange,
  projectDescription,
  uploading,
}: MoodboardBrowserProps) {
  const [open, setOpen] = useState(false);

  const selectedCount = images.filter((img) => img.selected).length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="default">
            <ImageIcon data-icon="inline-start" />
            Browse Moodboard
            {images.length > 0 && (
              <span className="ml-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                {images.length}
              </span>
            )}
          </Button>
        }
      />

      <DialogContent
        className="sm:max-w-3xl max-h-[80vh]"
      >
        <DialogHeader>
          <DialogTitle>
            Moodboard
            {selectedCount > 0 && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                {selectedCount} selected
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto space-y-4 -mx-4 px-4">
          <MoodboardSearch
            onAddImage={onAddFromPinterest}
            projectDescription={projectDescription}
          />

          <div className="space-y-2">
            <Label>Upload reference images</Label>
            <ImageUpload
              onUpload={onUpload}
              label="Upload reference images"
              description={uploading ? "Uploading..." : "Drag and drop or click to select multiple"}
              className="h-24"
              multiple
            />
          </div>

          <MoodboardGrid
            images={images}
            onToggleSelect={onToggleSelect}
            onRemove={onRemove}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
