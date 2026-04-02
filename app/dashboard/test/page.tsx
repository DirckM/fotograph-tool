"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Copy,
  ExternalLink,
  Loader2,
  Plus,
  Trash2,
  Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import type { Project } from "@/types";

interface TestScenario {
  name: string;
  description: string;
  moodboardUrls: string[];
}

const PRESET_SCENARIOS: TestScenario[] = [
  {
    name: "Male model — freckled, blue eyes",
    description:
      "Young man, early 20s, light skin with prominent freckles, short cropped red-blonde hair, sharp blue eyes, strong jawline, athletic build. Clean-shaven, symmetrical features.",
    moodboardUrls: [],
  },
  {
    name: "Female model — editorial, dark features",
    description:
      "Woman, late 20s, warm brown skin, dark brown eyes, high cheekbones, full lips. Long straight black hair, elegant neck. Natural beauty, minimal makeup look.",
    moodboardUrls: [],
  },
  {
    name: "Androgynous model — striking features",
    description:
      "Androgynous person, early 20s, pale skin, platinum blonde buzzcut, green eyes, angular face with sharp cheekbones and defined brow. Lean build, strong neck.",
    moodboardUrls: [],
  },
];

export default function TestSuitePage() {
  const router = useRouter();

  // Custom scenario
  const [name, setName] = useState("Custom Test");
  const [description, setDescription] = useState("");
  const [moodboardUrls, setMoodboardUrls] = useState<string[]>([]);
  const [newUrl, setNewUrl] = useState("");
  const [creating, setCreating] = useState(false);

  // Existing projects
  const [existingProjects, setExistingProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((projects: Project[]) => {
        setExistingProjects(
          projects.filter((p) => p.current_stage >= 1).slice(0, 10)
        );
      })
      .finally(() => setLoadingProjects(false));
  }, []);

  const createScenario = useCallback(
    async (scenario: TestScenario) => {
      setCreating(true);
      try {
        const res = await fetch("/api/projects/seed/test-scenario", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(scenario),
        });
        if (res.ok) {
          const data = await res.json();
          router.push(data.url);
        }
      } finally {
        setCreating(false);
      }
    },
    [router]
  );

  const handleAddUrl = useCallback(() => {
    if (newUrl.trim()) {
      setMoodboardUrls((prev) => [...prev, newUrl.trim()]);
      setNewUrl("");
    }
  }, [newUrl]);

  const handleRemoveUrl = useCallback((index: number) => {
    setMoodboardUrls((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleCreateCustom = useCallback(() => {
    createScenario({ name, description, moodboardUrls });
  }, [name, description, moodboardUrls, createScenario]);

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-6 py-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Test Suite</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create pre-configured projects to test model generation flows. Pick a
          preset or build your own scenario.
        </p>
      </div>

      {/* Quick-launch existing projects */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold">Continue Testing</h2>
        <p className="text-sm text-muted-foreground">
          Jump back into an existing project to test refinement, angles, etc.
        </p>
        {loadingProjects ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading projects...
          </div>
        ) : existingProjects.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No projects at model stage yet. Create one below.
          </p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {existingProjects.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() =>
                  router.push(
                    `/dashboard/projects/${p.id}/model`
                  )
                }
                className="flex items-center gap-3 rounded-lg border border-border bg-card/50 px-4 py-3 text-left transition-colors hover:bg-card"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {p.name}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    Stage {p.current_stage} &middot;{" "}
                    {new Date(p.created_at).toLocaleDateString()}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            ))}
          </div>
        )}
      </div>

      <Separator />

      {/* Preset scenarios */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold">Quick Scenarios</h2>
        <p className="text-sm text-muted-foreground">
          One-click project creation with pre-filled descriptions. Add your own
          reference images after creation.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          {PRESET_SCENARIOS.map((scenario) => (
            <div
              key={scenario.name}
              className="flex flex-col gap-3 rounded-lg border border-border bg-card/50 p-4"
            >
              <div className="flex-1">
                <p className="text-sm font-medium">{scenario.name}</p>
                <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">
                  {scenario.description}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => createScenario(scenario)}
                disabled={creating}
              >
                {creating ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Plus className="h-3 w-3" />
                )}
                Create & Open
              </Button>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      {/* Custom scenario */}
      <div className="space-y-4">
        <h2 className="text-base font-semibold">Custom Scenario</h2>
        <p className="text-sm text-muted-foreground">
          Build your own test with a specific description and reference images.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="test-name">Scenario Name</Label>
            <Input
              id="test-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Male model test"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="test-description">Model Description</Label>
          <Textarea
            id="test-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the model you want to generate..."
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label>Reference Image URLs</Label>
          <p className="text-xs text-muted-foreground">
            Paste URLs of reference images to pre-load into the moodboard.
            These get added as moodboard assets so you can select which ones to
            use during generation.
          </p>
          <div className="flex gap-2">
            <Input
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              placeholder="https://example.com/reference.jpg"
              onKeyDown={(e) => e.key === "Enter" && handleAddUrl()}
            />
            <Button variant="outline" onClick={handleAddUrl} disabled={!newUrl.trim()}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {moodboardUrls.length > 0 && (
            <div className="space-y-1.5">
              {moodboardUrls.map((url, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 rounded border border-border bg-muted/50 px-3 py-1.5"
                >
                  <ImageIcon className="h-3 w-3 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate text-xs">
                    {url}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveUrl(i)}
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <Button
          onClick={handleCreateCustom}
          disabled={creating || !description.trim()}
          size="lg"
        >
          {creating ? (
            <>
              <Loader2 className="animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Plus />
              Create Test Project & Open
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
