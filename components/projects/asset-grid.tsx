"use client";

import Image from "next/image";
import { X, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ImageLightbox } from "@/components/ui/image-lightbox";
import { cn } from "@/lib/utils";
import type { ProjectAsset } from "@/types";

interface AssetGridProps {
  assets: ProjectAsset[];
  selectedIds?: Set<string>;
  onSelect?: (assetId: string) => void;
  onRemove?: (assetId: string) => void;
  selectable?: boolean;
  columns?: number;
}

const SOURCE_LABELS: Record<ProjectAsset["source"], string> = {
  upload: "Upload",
  pinterest: "Pinterest",
  gemini: "AI",
};

function getImageUrl(asset: ProjectAsset): string | null {
  if (asset.external_url) return asset.external_url;
  if (asset.storage_path) return asset.storage_path;
  return null;
}

export function AssetGrid({
  assets,
  selectedIds,
  onSelect,
  onRemove,
  selectable = false,
  columns = 4,
}: AssetGridProps) {
  return (
    <div
      className="grid gap-3"
      style={{
        gridTemplateColumns: `repeat(2, minmax(0, 1fr))`,
      }}
      data-columns={columns}
    >
      <style>{`
        @media (min-width: 768px) {
          [data-columns="3"] { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; }
          [data-columns="4"] { grid-template-columns: repeat(4, minmax(0, 1fr)) !important; }
          [data-columns="5"] { grid-template-columns: repeat(5, minmax(0, 1fr)) !important; }
          [data-columns="6"] { grid-template-columns: repeat(6, minmax(0, 1fr)) !important; }
        }
      `}</style>
      {assets.map((asset) => {
        const imageUrl = getImageUrl(asset);
        const isSelected = selectedIds?.has(asset.id) ?? false;

        return (
          <div
            key={asset.id}
            className={cn(
              "group relative overflow-hidden rounded-lg bg-muted",
              "aspect-square",
              selectable && "cursor-pointer",
              isSelected && "ring-2 ring-blue-500 ring-offset-2 ring-offset-background"
            )}
            onClick={() => {
              if (selectable && onSelect) {
                onSelect(asset.id);
              }
            }}
          >
            {imageUrl && (
              !selectable ? (
                <ImageLightbox src={imageUrl} className="absolute inset-0 h-full w-full">
                  <Image
                    src={imageUrl}
                    alt={asset.role ?? "Project asset"}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 50vw, 25vw"
                  />
                </ImageLightbox>
              ) : (
                <Image
                  src={imageUrl}
                  alt={asset.role ?? "Project asset"}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 50vw, 25vw"
                />
              )
            )}

            {selectable && (
              <div className="absolute top-2 left-2 z-10">
                <div
                  className={cn(
                    "flex h-5 w-5 items-center justify-center rounded border-2 transition-colors",
                    isSelected
                      ? "border-blue-500 bg-blue-500 text-white"
                      : "border-white/80 bg-black/30"
                  )}
                >
                  {isSelected && <Check className="h-3 w-3" />}
                </div>
              </div>
            )}

            {onRemove && (
              <div className="absolute top-2 right-2 z-10 opacity-0 transition-opacity group-hover:opacity-100">
                <Button
                  variant="destructive"
                  size="icon"
                  className="h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(asset.id);
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}

            <div className="absolute bottom-2 left-2 z-10">
              <Badge variant="secondary" className="text-[10px]">
                {SOURCE_LABELS[asset.source]}
              </Badge>
            </div>
          </div>
        );
      })}
    </div>
  );
}
