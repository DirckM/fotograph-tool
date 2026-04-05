"use client";

import { useCallback, useEffect, useState } from "react";
import { ImageIcon, Library, Plus, Loader2 } from "lucide-react";
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
import { cn } from "@/lib/utils";

interface MoodboardImage {
  id: string;
  url: string;
  selected: boolean;
  note?: string;
}

interface LibraryAsset {
  id: string;
  asset_type: string;
  storage_path: string | null;
  external_url: string | null;
  source: string;
  created_at: string;
  project_id: string | null;
  project_name: string | null;
}

interface MoodboardBrowserProps {
  images: MoodboardImage[];
  onAddFromPinterest: (imageUrl: string, description: string) => void;
  onAddFromLibrary?: (url: string) => void;
  onUpload: (file: File) => void;
  onToggleSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onNoteChange?: (id: string, note: string) => void;
  onImportSelected?: () => Promise<void> | void;
  importSelectedLabel?: string;
  triggerLabel?: string;
  triggerClassName?: string;
  projectDescription?: string;
  uploading?: boolean;
  libraryCategory?: string;
}

type Tab = "search" | "library";

export function MoodboardBrowser({
  images,
  onAddFromPinterest,
  onAddFromLibrary,
  onUpload,
  onToggleSelect,
  onRemove,
  onNoteChange,
  onImportSelected,
  importSelectedLabel,
  triggerLabel,
  triggerClassName,
  projectDescription,
  uploading,
  libraryCategory,
}: MoodboardBrowserProps) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("search");
  const [libraryAssets, setLibraryAssets] = useState<LibraryAsset[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [addingIds, setAddingIds] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);

  const selectedCount = images.filter((img) => img.selected).length;

  const existingUrls = new Set(images.map((img) => img.url));

  const fetchLibrary = useCallback(async () => {
    setLibraryLoading(true);
    try {
      const url = libraryCategory
        ? `/api/moodboard/library?category=${libraryCategory}`
        : "/api/moodboard/library";
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setLibraryAssets(data.assets ?? []);
      }
    } finally {
      setLibraryLoading(false);
    }
  }, [libraryCategory]);

  useEffect(() => {
    if (open && tab === "library") {
      fetchLibrary();
    }
  }, [open, tab, fetchLibrary]);

  const handleAddFromLibrary = useCallback(
    async (asset: LibraryAsset) => {
      if (!onAddFromLibrary) return;
      const url = asset.storage_path ?? asset.external_url;
      if (!url) return;
      setAddingIds((prev) => new Set(prev).add(asset.id));
      try {
        await onAddFromLibrary(url);
      } finally {
        setAddingIds((prev) => {
          const next = new Set(prev);
          next.delete(asset.id);
          return next;
        });
      }
    },
    [onAddFromLibrary]
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="default" data-tour="moodboard-trigger" className={triggerClassName}>
            <ImageIcon data-icon="inline-start" />
            {triggerLabel ?? "Browse References"}
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
            Reference Images
            {selectedCount > 0 && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                {selectedCount} selected
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {onAddFromLibrary && (
          <div className="flex gap-1 border-b border-border -mx-4 px-4">
            <button
              type="button"
              onClick={() => setTab("search")}
              className={cn(
                "px-3 py-2 text-sm font-medium border-b-2 transition-colors",
                tab === "search"
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              Search & Upload
            </button>
            <button
              type="button"
              onClick={() => setTab("library")}
              data-tour="moodboard-library-tab"
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors",
                tab === "library"
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Library className="size-3.5" />
              From Library
            </button>
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto space-y-4 -mx-4 px-4">
          {tab === "search" && (
            <>
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
            </>
          )}

          {tab === "library" && (
            <div className="space-y-3">
              {libraryLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
                </div>
              ) : libraryAssets.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-sm text-muted-foreground">
                    No images in your library yet. Upload images from the Moodboard page to build your library.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4" data-tour="moodboard-library-grid">
                  {libraryAssets.map((asset, idx) => {
                    const url = asset.storage_path ?? asset.external_url ?? "";
                    const alreadyAdded = existingUrls.has(url);
                    const adding = addingIds.has(asset.id);
                    return (
                      <div key={asset.id} className="group relative overflow-hidden rounded-lg border border-border">
                        <img
                          src={url}
                          alt="Library image"
                          className="aspect-square w-full object-cover"
                          loading="lazy"
                        />
                        {asset.project_name && (
                          <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1">
                            <p className="truncate text-[10px] text-white/80">
                              {asset.project_name}
                            </p>
                          </div>
                        )}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/30">
                          {alreadyAdded ? (
                            <span className="rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white opacity-0 group-hover:opacity-100">
                              Already added
                            </span>
                          ) : (
                            <Button
                              size="sm"
                              className="opacity-0 group-hover:opacity-100"
                              onClick={() => handleAddFromLibrary(asset)}
                              disabled={adding}
                              {...(idx === 0 ? { "data-tour": "moodboard-library-first-add" } : {})}
                            >
                              {adding ? (
                                <Loader2 className="size-3.5 animate-spin" />
                              ) : (
                                <Plus className="size-3.5" />
                              )}
                              Add
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <MoodboardGrid
            images={images}
            onToggleSelect={onToggleSelect}
            onRemove={onRemove}
          />
        </div>

        {onImportSelected && selectedCount > 0 && (
          <div className="border-t border-border pt-3 -mx-4 px-4">
            <Button
              className="w-full"
              onClick={async () => {
                setImporting(true);
                try {
                  await onImportSelected();
                  setOpen(false);
                } finally {
                  setImporting(false);
                }
              }}
              disabled={importing}
            >
              {importing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                importSelectedLabel ?? `Import ${selectedCount} Selected`
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
