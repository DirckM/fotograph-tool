"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowRight, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ImageUpload } from "@/components/image-upload";
import { StageLayout } from "@/components/projects/stage-layout";
import { useFileUpload } from "@/lib/hooks";
import type { Project, ProjectAsset, ProjectStageState } from "@/types";

export default function ContextPage() {
  const params = useParams<{ projectId: string }>();
  const router = useRouter();
  const { upload, uploading } = useFileUpload();

  const [project, setProject] = useState<Project | null>(null);
  const [stageState, setStageState] = useState<ProjectStageState | null>(null);
  const [contextText, setContextText] = useState("");
  const [assets, setAssets] = useState<ProjectAsset[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [projectRes, stageRes, assetsRes] = await Promise.all([
          fetch(`/api/projects/${params.projectId}`),
          fetch(`/api/projects/${params.projectId}/stage/0`),
          fetch(`/api/projects/${params.projectId}/assets?stage=0`),
        ]);

        if (projectRes.ok) {
          const proj: Project = await projectRes.json();
          setProject(proj);
          setContextText(proj.context_text ?? "");
        }

        if (stageRes.ok) {
          const state: ProjectStageState = await stageRes.json();
          setStageState(state);
          if (state.state?.context_text && !project?.context_text) {
            setContextText(state.state.context_text as string);
          }
        }

        if (assetsRes.ok) {
          setAssets(await assetsRes.json());
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params.projectId]);

  const handleFileUpload = useCallback(
    async (file: File) => {
      const result = await upload(file);

      const res = await fetch(
        `/api/projects/${params.projectId}/assets`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            stage: 0,
            asset_type: "context_file",
            source: "upload",
            storage_path: result.publicUrl,
          }),
        }
      );

      if (res.ok) {
        const asset: ProjectAsset = await res.json();
        setAssets((prev) => [...prev, asset]);
      }
    },
    [upload, params.projectId]
  );

  const handleRemoveAsset = useCallback(
    async (assetId: string) => {
      const res = await fetch(
        `/api/projects/${params.projectId}/assets/${assetId}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        setAssets((prev) => prev.filter((a) => a.id !== assetId));
      }
    },
    [params.projectId]
  );

  const handleSaveAndContinue = useCallback(async () => {
    setSaving(true);
    try {
      await fetch(`/api/projects/${params.projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context_text: contextText }),
      });

      await fetch(`/api/projects/${params.projectId}/stage/0`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: { context_text: contextText } }),
      });

      await fetch(`/api/projects/${params.projectId}/stage/0/approve`, {
        method: "POST",
      });

      router.push(`/dashboard/projects/${params.projectId}/model`);
    } finally {
      setSaving(false);
    }
  }, [params.projectId, contextText, router]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <StageLayout
      title={<>Stage 0: <span className="text-heading">Context</span> Briefing</>}
      description="Provide the project brief and upload any reference documents or images."
      aside={
        <>
          <div className="space-y-3">
            <Label>Reference Documents & Images</Label>
            <ImageUpload
              onUpload={handleFileUpload}
              label="Upload reference file"
              description="Drag and drop or click to browse"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className="min-h-32"
            />
          </div>

          {assets.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">
                Uploaded files ({assets.length})
              </Label>
              <ul className="space-y-2">
                {assets.map((asset) => {
                  const filename = asset.storage_path
                    ? asset.storage_path.split("/").pop()
                    : "Uploaded file";
                  const isImage = asset.storage_path
                    ? /\.(jpe?g|png|webp)$/i.test(asset.storage_path)
                    : false;

                  return (
                    <li
                      key={asset.id}
                      className="flex items-center gap-3 rounded-md border border-border p-2"
                    >
                      {isImage && asset.storage_path ? (
                        <img
                          src={asset.storage_path}
                          alt=""
                          className="h-10 w-10 rounded object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded bg-muted">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      <span className="min-w-0 flex-1 truncate text-sm">
                        {filename}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        onClick={() => handleRemoveAsset(asset.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </>
      }
      footer={
        <Button
          size="lg"
          onClick={handleSaveAndContinue}
          disabled={saving || uploading || !contextText.trim()}
          data-tour="context-save"
        >
          {saving ? "Saving..." : "Save & Continue"}
          {!saving && <ArrowRight className="ml-2 h-4 w-4" />}
        </Button>
      }
    >
      <div className="flex flex-1 flex-col space-y-2">
        <Label htmlFor="context-text">
          Description / Employer Brief
        </Label>
        <Textarea
          id="context-text"
          placeholder="Describe the project goals, brand guidelines, target audience, desired style, and any other relevant context..."
          value={contextText}
          onChange={(e) => setContextText(e.target.value)}
          className="h-full resize-none"
        />
      </div>
    </StageLayout>
  );
}
