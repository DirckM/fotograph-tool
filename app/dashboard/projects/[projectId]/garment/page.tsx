"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Shirt, Loader2, Plus, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { GarmentCard } from "@/components/projects/garment-card";
import { MoodboardBrowser } from "@/components/projects/moodboard-browser";
import { StageGate } from "@/components/projects/stage-gate";
import { StageLayout } from "@/components/projects/stage-layout";
import { useFileUpload } from "@/lib/hooks";
import type { Project, ProjectAsset } from "@/types";
import type { GarmentView } from "@/components/projects/garment-card";

function generateGarmentId(): string {
  return crypto.randomUUID();
}

function getGarmentId(asset: ProjectAsset): string {
  return (asset.metadata?.garment_id as string) ?? "default";
}

function groupAssetsByGarment(assets: ProjectAsset[]): Map<string, ProjectAsset[]> {
  const map = new Map<string, ProjectAsset[]>();
  for (const asset of assets) {
    const gid = getGarmentId(asset);
    const list = map.get(gid) ?? [];
    list.push(asset);
    map.set(gid, list);
  }
  return map;
}

export default function GarmentStagePage() {
  const { projectId } = useParams<{ projectId: string }>();
  const router = useRouter();
  const { upload, uploading } = useFileUpload();

  const [project, setProject] = useState<Project | null>(null);
  const [assets, setAssets] = useState<ProjectAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [garmentIds, setGarmentIds] = useState<string[]>([]);
  const [uploadingView, setUploadingView] = useState<{
    garmentId: string;
    view: GarmentView;
  } | null>(null);

  const [moodboardAssets, setMoodboardAssets] = useState<ProjectAsset[]>([]);
  const [selectedMoodboardIds, setSelectedMoodboardIds] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState<Record<string, string>>({});
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const loadData = useCallback(async () => {
    try {
      const [projectRes, assetsRes] = await Promise.all([
        fetch(`/api/projects/${projectId}`),
        fetch(`/api/projects/${projectId}/assets?stage=4`),
      ]);

      if (projectRes.ok) {
        setProject(await projectRes.json());
      }
      if (assetsRes.ok) {
        const loadedAssets: ProjectAsset[] = await assetsRes.json();

        const garmentAssets = loadedAssets.filter((a) => a.asset_type === "garment_image");
        const moodboard = loadedAssets.filter((a) => a.asset_type === "garment_moodboard");

        setAssets(garmentAssets);
        setMoodboardAssets(moodboard);

        const existingIds = new Set<string>();
        for (const a of garmentAssets) {
          existingIds.add(getGarmentId(a));
        }
        setGarmentIds(Array.from(existingIds));

        const loadedNotes: Record<string, string> = {};
        const loadedSelected = new Set<string>();
        for (const a of moodboard) {
          const meta = a.metadata as Record<string, unknown> | null;
          if (typeof meta?.note === "string" && meta.note) loadedNotes[a.id] = meta.note;
          if (meta?.selected === true) loadedSelected.add(a.id);
        }
        setNotes(loadedNotes);
        setSelectedMoodboardIds(loadedSelected);
      }
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddGarment = useCallback(() => {
    const newId = generateGarmentId();
    setGarmentIds((prev) => [...prev, newId]);
  }, []);

  const handleUpload = useCallback(
    async (garmentId: string, view: GarmentView, file: File) => {
      setUploadingView({ garmentId, view });
      try {
        const result = await upload(file);

        const assetRes = await fetch(`/api/projects/${projectId}/assets`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            stage: 4,
            asset_type: "garment_image",
            source: "upload",
            storage_path: result.publicUrl,
            metadata: { garment_id: garmentId, view },
          }),
        });

        if (assetRes.ok) {
          const asset: ProjectAsset = await assetRes.json();
          setAssets((prev) => [...prev, asset]);
        }
      } finally {
        setUploadingView(null);
      }
    },
    [projectId, upload]
  );

  const handleRemoveAsset = useCallback(
    async (assetId: string) => {
      const res = await fetch(
        `/api/projects/${projectId}/assets/${assetId}`,
        { method: "DELETE" }
      );

      if (res.ok) {
        setAssets((prev) => prev.filter((a) => a.id !== assetId));
      }
    },
    [projectId]
  );

  const handleRemoveGarment = useCallback(
    async (garmentId: string) => {
      const garmentAssets = assets.filter(
        (a) => getGarmentId(a) === garmentId
      );

      await Promise.all(
        garmentAssets.map((a) =>
          fetch(`/api/projects/${projectId}/assets/${a.id}`, {
            method: "DELETE",
          })
        )
      );

      setAssets((prev) =>
        prev.filter((a) => getGarmentId(a) !== garmentId)
      );
      setGarmentIds((prev) => prev.filter((id) => id !== garmentId));
    },
    [assets, projectId]
  );

  // -- Moodboard handlers --

  const handleAddPinterestImage = useCallback(
    async (imageUrl: string, _description: string) => {
      const res = await fetch(`/api/projects/${projectId}/assets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage: 4,
          asset_type: "garment_moodboard",
          source: "pinterest",
          external_url: imageUrl,
        }),
      });
      if (res.ok) {
        const asset: ProjectAsset = await res.json();
        setMoodboardAssets((prev) => [...prev, asset]);
      }
    },
    [projectId]
  );

  const handleUploadMoodboardImage = useCallback(
    async (file: File) => {
      const result = await upload(file);
      const res = await fetch(`/api/projects/${projectId}/assets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage: 4,
          asset_type: "garment_moodboard",
          source: "upload",
          storage_path: result.publicUrl,
        }),
      });
      if (res.ok) {
        const asset: ProjectAsset = await res.json();
        setMoodboardAssets((prev) => [...prev, asset]);
      }
    },
    [upload, projectId]
  );

  const handleAddFromLibrary = useCallback(
    async (url: string) => {
      const isExternal = url.startsWith("http") && !url.includes("supabase");
      const res = await fetch(`/api/projects/${projectId}/assets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage: 4,
          asset_type: "garment_moodboard",
          source: "upload",
          ...(isExternal ? { external_url: url } : { storage_path: url }),
        }),
      });
      if (res.ok) {
        const asset: ProjectAsset = await res.json();
        setMoodboardAssets((prev) => [...prev, asset]);
      }
    },
    [projectId]
  );

  const handleToggleMoodboardSelect = useCallback(
    (id: string) => {
      setSelectedMoodboardIds((prev) => {
        const next = new Set(prev);
        const nowSelected = !next.has(id);
        nowSelected ? next.add(id) : next.delete(id);
        fetch(`/api/projects/${projectId}/assets/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ metadata: { note: notes[id] ?? "", selected: nowSelected } }),
        });
        return next;
      });
    },
    [projectId, notes]
  );

  const handleRemoveMoodboardImage = useCallback(
    async (id: string) => {
      const res = await fetch(`/api/projects/${projectId}/assets/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setMoodboardAssets((prev) => prev.filter((a) => a.id !== id));
        setSelectedMoodboardIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [projectId]
  );

  const handleNoteChange = useCallback(
    (id: string, note: string) => {
      setNotes((prev) => ({ ...prev, [id]: note }));
      clearTimeout(saveTimers.current[id]);
      saveTimers.current[id] = setTimeout(() => {
        fetch(`/api/projects/${projectId}/assets/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ metadata: { note, selected: selectedMoodboardIds.has(id) } }),
        });
      }, 600);
    },
    [projectId, selectedMoodboardIds]
  );

  const moodboardGridImages = moodboardAssets.map((a) => ({
    id: a.id,
    url: a.external_url ?? a.storage_path ?? "",
    selected: selectedMoodboardIds.has(a.id),
    note: notes[a.id],
  }));

  const handleImportSelected = useCallback(async () => {
    const selected = moodboardAssets.filter((a) => selectedMoodboardIds.has(a.id));
    if (selected.length === 0) return;

    try {
      for (const moodboardAsset of selected) {
        const url = moodboardAsset.external_url ?? moodboardAsset.storage_path;
        if (!url) continue;

        const garmentId = generateGarmentId();
        const isExternal = !!moodboardAsset.external_url;

        const res = await fetch(`/api/projects/${projectId}/assets`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            stage: 4,
            asset_type: "garment_image",
            source: moodboardAsset.source,
            ...(isExternal ? { external_url: url } : { storage_path: url }),
            metadata: { garment_id: garmentId, view: "front" },
          }),
        });

        if (res.ok) {
          const asset: ProjectAsset = await res.json();
          setAssets((prev) => [...prev, asset]);
          setGarmentIds((prev) => [...prev, garmentId]);
        }
      }
    } catch {
      // errors handled per-asset above
    }
  }, [moodboardAssets, selectedMoodboardIds, projectId]);

  const handleApprove = useCallback(async () => {
    setApproving(true);
    try {
      const res = await fetch(
        `/api/projects/${projectId}/stage/4/approve`,
        { method: "POST" }
      );

      if (res.ok) {
        router.push(`/dashboard/projects/${projectId}/final`);
      }
    } finally {
      setApproving(false);
    }
  }, [projectId, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!project) return null;

  const grouped = groupAssetsByGarment(assets);
  const hasAnyAssets = assets.length > 0;

  return (
    <StageGate currentStage={project.current_stage} requiredStage={4}>
      <StageLayout
        title={
          <>
            Stage 4: <span className="text-heading">Garment</span> Importation
          </>
        }
        description="Upload garment reference images. Add multiple garments and upload front, back, and side views for each."
        guide={[
          "Click 'Add garment' in the sidebar to create a new garment slot. Each garment is a separate clothing item (top, bottom, dress, accessory).",
          "Upload photos of the actual garment - front, back, and side views. These should be clean flat-lay or mannequin shots for best results.",
          "You can add multiple garments. In the final compositing stage, each garment will be combined with the model, pose, and environment separately.",
          "Use 'Browse References' to find similar garments on Pinterest if you want additional style references.",
        ]}
        guideTip="Upload actual product photos, not styled lookbook images. Clean flat-lays or mannequin shots give the AI the best understanding of the garment's shape, fabric, and details."
        contentKey={String(garmentIds.length) + "-" + String(assets.length)}
        aside={
          <div className="flex flex-col gap-4">
            <button
              type="button"
              onClick={handleAddGarment}
              data-tour="garment-add"
              className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border p-8 transition-colors hover:border-muted-foreground/50 hover:bg-muted/50"
            >
              <Plus className="h-8 w-8 text-muted-foreground" />
              <span className="text-sm font-medium">Add Garment</span>
              <span className="text-xs text-muted-foreground">
                Upload front, back, and side views
              </span>
            </button>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                Reference images
                {moodboardAssets.length > 0 && (
                  <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                    ({moodboardAssets.length})
                  </span>
                )}
              </Label>
              <MoodboardBrowser
                images={moodboardGridImages}
                onAddFromPinterest={handleAddPinterestImage}
                onAddFromLibrary={handleAddFromLibrary}
                onUpload={handleUploadMoodboardImage}
                onToggleSelect={handleToggleMoodboardSelect}
                onRemove={handleRemoveMoodboardImage}
                onNoteChange={handleNoteChange}
                onImportSelected={handleImportSelected}
                importSelectedLabel={`Import ${selectedMoodboardIds.size} as ${selectedMoodboardIds.size === 1 ? "Garment" : "Garments"}`}
                triggerClassName="w-full h-12 text-base"
                projectDescription={project.description ?? ""}
                uploading={uploading}
                libraryCategory="garment"
              />
            </div>

            {uploading && (
              <p className="text-sm text-muted-foreground">Uploading...</p>
            )}

            {hasAnyAssets && (
              <p className="text-sm text-muted-foreground">
                {garmentIds.length}{" "}
                {garmentIds.length === 1 ? "garment" : "garments"},{" "}
                {assets.length} {assets.length === 1 ? "image" : "images"}{" "}
                total
              </p>
            )}
          </div>
        }
        footer={
          hasAnyAssets ? (
            <Button
              size="lg"
              onClick={handleApprove}
              disabled={approving}
            >
              {approving ? (
                <>
                  <Loader2 className="animate-spin" />
                  Approving...
                </>
              ) : (
                <>
                  <CheckCircle2 />
                  Approve & Continue
                </>
              )}
            </Button>
          ) : undefined
        }
      >
        {garmentIds.length > 0 ? (
          <div className="flex-1 overflow-y-auto space-y-4">
            {garmentIds.map((gid, i) => (
              <GarmentCard
                key={gid}
                garmentId={gid}
                label={`Garment ${i + 1}`}
                assets={grouped.get(gid) ?? []}
                onUpload={handleUpload}
                onRemoveAsset={handleRemoveAsset}
                onRemoveGarment={handleRemoveGarment}
                uploading={
                  uploadingView?.garmentId === gid
                    ? uploadingView.view
                    : null
                }
              />
            ))}
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-border bg-muted/30 text-muted-foreground">
            <Shirt className="h-12 w-12 opacity-40" />
            <p className="text-sm">Add a garment to start uploading images</p>
            <Button variant="outline" onClick={handleAddGarment}>
              <Plus className="mr-2 h-4 w-4" />
              Add Garment
            </Button>
          </div>
        )}
      </StageLayout>
    </StageGate>
  );
}
