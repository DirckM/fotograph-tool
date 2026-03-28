"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { X, ExternalLink, Upload, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface LibraryAsset {
  id: string;
  asset_type: string;
  storage_path: string | null;
  external_url: string | null;
  source: "upload" | "pinterest" | "gemini";
  created_at: string;
  project_id: string;
  project_name: string | null;
}

const CATEGORIES = [
  { key: "all", label: "All" },
  { key: "model", label: "Model" },
  { key: "env", label: "Environment" },
  { key: "pose", label: "Pose" },
  { key: "garment", label: "Garment" },
] as const;

const ASSET_TYPE_LABELS: Record<string, string> = {
  face_moodboard: "Model",
  model_moodboard: "Model",
  env_moodboard: "Environment",
  pose_moodboard: "Pose",
  garment_image: "Garment",
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getImageUrl(asset: LibraryAsset): string {
  return asset.storage_path ?? asset.external_url ?? "";
}

export default function MoodboardLibraryPage() {
  const [assets, setAssets] = useState<LibraryAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("all");
  const [selectedAsset, setSelectedAsset] = useState<LibraryAsset | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch("/api/moodboard/library")
      .then((res) => res.json())
      .then((data) => setAssets(data.assets ?? []))
      .finally(() => setLoading(false));
  }, []);

  const filtered =
    activeCategory === "all"
      ? assets
      : assets.filter((a) => {
          const map: Record<string, string[]> = {
            model: ["face_moodboard", "model_moodboard"],
            env: ["env_moodboard"],
            pose: ["pose_moodboard"],
            garment: ["garment_image"],
          };
          return (map[activeCategory] ?? []).includes(a.asset_type);
        });

  const projectCount = new Set(assets.map((a) => a.project_id)).size;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="shrink-0 border-b border-border px-6 py-5">
        <h1 className="text-xl font-semibold tracking-tight">Moodboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {assets.length} {assets.length === 1 ? "image" : "images"} across{" "}
          {projectCount} {projectCount === 1 ? "project" : "projects"}
        </p>
      </div>

      {/* Filter pills */}
      <div className="shrink-0 border-b border-border px-6 py-3">
        <div className="flex gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              type="button"
              onClick={() => setActiveCategory(cat.key)}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors",
                activeCategory === cat.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <ImageIcon className="mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                {assets.length === 0
                  ? "No moodboard images yet. Import images in your projects to see them here."
                  : "No images in this category."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {filtered.map((asset) => {
                const url = getImageUrl(asset);
                if (!url) return null;
                return (
                  <button
                    key={asset.id}
                    type="button"
                    onClick={() => setSelectedAsset(asset)}
                    className={cn(
                      "group relative aspect-square overflow-hidden rounded-lg border-2 transition-all duration-200 hover:scale-[1.03]",
                      selectedAsset?.id === asset.id
                        ? "border-primary ring-2 ring-primary/20"
                        : "border-transparent"
                    )}
                  >
                    <Image
                      src={url}
                      alt={ASSET_TYPE_LABELS[asset.asset_type] ?? "Moodboard image"}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                    />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selectedAsset && (
          <div className="w-[340px] shrink-0 border-l border-border bg-card">
            <div className="flex h-full flex-col overflow-y-auto">
              {/* Panel header */}
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <span className="text-sm font-medium">Details</span>
                <button
                  type="button"
                  onClick={() => setSelectedAsset(null)}
                  className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Image preview */}
              <div className="relative aspect-square w-full bg-muted">
                <Image
                  src={getImageUrl(selectedAsset)}
                  alt="Selected image"
                  fill
                  className="object-contain"
                  sizes="340px"
                />
              </div>

              {/* Metadata */}
              <div className="flex flex-col gap-4 p-4">
                <div>
                  <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
                    Project
                  </span>
                  <Link
                    href={`/dashboard/projects/${selectedAsset.project_id}`}
                    className="mt-0.5 flex items-center gap-1.5 text-sm font-medium text-foreground transition-colors hover:text-primary"
                  >
                    {selectedAsset.project_name ?? "Unknown project"}
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>

                <div>
                  <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
                    Category
                  </span>
                  <p className="mt-0.5 text-sm">
                    {ASSET_TYPE_LABELS[selectedAsset.asset_type] ?? selectedAsset.asset_type}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
                    Added
                  </span>
                  <p className="mt-0.5 text-sm">
                    {formatDate(selectedAsset.created_at)}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
                    Source
                  </span>
                  <p className="mt-0.5 flex items-center gap-1.5 text-sm capitalize">
                    {selectedAsset.source === "upload" ? (
                      <Upload className="h-3.5 w-3.5 text-muted-foreground" />
                    ) : (
                      <ImageIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                    {selectedAsset.source}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
