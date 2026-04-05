"use client";

import { Trash2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ImageLightbox } from "@/components/ui/image-lightbox";
import { cn } from "@/lib/utils";
import type { ProjectAsset } from "@/types";

export type GarmentView = "front" | "back" | "side";

const VIEW_LABELS: Record<GarmentView, string> = {
  front: "Front",
  back: "Back",
  side: "Side",
};

const VIEW_ORDER: GarmentView[] = ["front", "back", "side"];

interface GarmentCardProps {
  garmentId: string;
  label: string;
  assets: ProjectAsset[];
  onUpload: (garmentId: string, view: GarmentView, file: File) => void;
  onRemoveAsset: (assetId: string) => void;
  onRemoveGarment: (garmentId: string) => void;
  uploading?: GarmentView | null;
}

const SUPABASE_STORAGE_BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/project-assets/`;

function getImageUrl(asset: ProjectAsset): string | null {
  if (asset.external_url) return asset.external_url;
  if (!asset.storage_path) return null;
  if (asset.storage_path.startsWith("http")) return asset.storage_path;
  return `${SUPABASE_STORAGE_BASE}${asset.storage_path}`;
}

export function GarmentCard({
  garmentId,
  label,
  assets,
  onUpload,
  onRemoveAsset,
  onRemoveGarment,
  uploading,
}: GarmentCardProps) {
  const assetsByView = new Map<GarmentView, ProjectAsset>();
  for (const asset of assets) {
    const view = (asset.metadata?.view as GarmentView) ?? "front";
    assetsByView.set(view, asset);
  }

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/50">
        <h3 className="text-sm font-medium">{label}</h3>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-destructive"
          onClick={() => onRemoveGarment(garmentId)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-3 p-3">
        {VIEW_ORDER.map((view) => {
          const asset = assetsByView.get(view);
          const imageUrl = asset ? getImageUrl(asset) : null;
          const isUploading = uploading === view;

          if (asset && imageUrl) {
            return (
              <div key={view} className="flex flex-col gap-1.5">
                <div className="group relative aspect-[3/4] overflow-hidden rounded-md bg-muted">
                  <ImageLightbox src={imageUrl} className="absolute inset-0 h-full w-full">
                    <img
                      src={imageUrl}
                      alt={`${label} ${VIEW_LABELS[view]}`}
                      className="h-full w-full object-cover"
                    />
                  </ImageLightbox>
                  <div className="absolute top-1.5 right-1.5 z-10 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button
                      variant="destructive"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => onRemoveAsset(asset.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <span className="text-center text-xs text-muted-foreground">
                  {VIEW_LABELS[view]}
                </span>
              </div>
            );
          }

          return (
            <div key={view} className="flex flex-col gap-1.5">
              <label
                className={cn(
                  "flex aspect-[3/4] cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed border-border transition-colors",
                  "hover:border-muted-foreground/50 hover:bg-muted/50",
                  isUploading && "pointer-events-none opacity-50"
                )}
              >
                <input
                  type="file"
                  className="hidden"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) onUpload(garmentId, view, file);
                    e.target.value = "";
                  }}
                  disabled={isUploading}
                />
                <Upload className="h-4 w-4 text-muted-foreground" />
                {isUploading && (
                  <span className="mt-1 text-[10px] text-muted-foreground">
                    Uploading...
                  </span>
                )}
              </label>
              <span className="text-center text-xs text-muted-foreground">
                {VIEW_LABELS[view]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
