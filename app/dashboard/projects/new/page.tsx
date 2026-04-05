"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const PROJECT_EXAMPLES = [
  {
    label: "Fashion editorial",
    text: "High-end editorial shoot for spring/summer collection. Moody studio lighting, minimalist styling, focus on fabric texture and silhouette.",
  },
  {
    label: "E-commerce lookbook",
    text: "Product lookbook for online store. Clean white background, consistent lighting, full outfit shots front and back, detail close-ups.",
  },
  {
    label: "Campaign shoot",
    text: "Brand campaign for social media and print ads. Outdoor urban setting, natural light, lifestyle feel, multiple outfit changes.",
  },
  {
    label: "Beauty editorial",
    text: "Close-up beauty editorial focusing on skin and makeup. Soft diffused lighting, clean backgrounds, emphasis on natural skin texture.",
  },
  {
    label: "Streetwear lookbook",
    text: "Street-style lookbook shoot. Gritty urban locations, golden hour lighting, casual poses, mix of wide and tight shots.",
  },
  {
    label: "Catalog production",
    text: "High-volume catalog shoot for seasonal collection. Neutral backgrounds, even lighting, standard poses per garment category.",
  },
];

const CLIENT_EXAMPLES = [
  {
    name: "Vogue Netherlands",
    notes: "Editorial spread for September issue. Brand guidelines require muted earth tones, no heavy retouching. Deadline: March 15.",
  },
  {
    name: "ASOS",
    notes: "E-commerce product shots, white background, consistent lighting across all garments. Need front + back for every item. 200+ SKUs.",
  },
  {
    name: "Nike EMEA",
    notes: "Campaign for new running line. Outdoor action shots, diverse casting, energetic vibe. Must align with global brand book.",
  },
  {
    name: "Independent designer",
    notes: "Small capsule collection, 8 pieces. Creative freedom on styling. Budget is limited so we need to be efficient with setups.",
  },
];

export default function NewProjectPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [showExamples, setShowExamples] = useState(false);
  const [employerName, setEmployerName] = useState("");
  const [employerNotes, setEmployerNotes] = useState("");
  const [showClientExamples, setShowClientExamples] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          employer_name: employerName.trim() || undefined,
          employer_notes: employerNotes.trim() || undefined,
        }),
      });

      if (res.ok) {
        const project = await res.json();
        router.push(`/dashboard/projects/${project.id}`);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6 lg:p-8">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/dashboard/projects")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            New Project
          </h1>
          <p className="text-sm text-muted-foreground">
            Set up a new photoshoot project
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6" data-tour="new-project-form">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Project Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Project Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Spring Collection 2026"
                required
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="description">Description</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-muted-foreground"
                  onClick={() => setShowExamples((v) => !v)}
                >
                  {showExamples ? "Hide examples" : "Examples"}
                </Button>
              </div>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of the photoshoot..."
                rows={3}
              />
              {showExamples && (
                <div className="grid gap-2 sm:grid-cols-2">
                  {PROJECT_EXAMPLES.map((ex) => (
                    <button
                      key={ex.label}
                      type="button"
                      className="rounded-lg border border-border px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:bg-muted/60 hover:text-foreground"
                      onClick={() => {
                        setDescription(ex.text);
                        setShowExamples(false);
                      }}
                    >
                      <span className="font-medium text-foreground">{ex.label}</span>
                      <br />
                      {ex.text}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Client Information</CardTitle>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground"
                onClick={() => setShowClientExamples((v) => !v)}
              >
                {showClientExamples ? "Hide examples" : "Examples"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {showClientExamples && (
              <div className="grid gap-2 sm:grid-cols-2">
                {CLIENT_EXAMPLES.map((ex) => (
                  <button
                    key={ex.name}
                    type="button"
                    className="rounded-lg border border-border px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:bg-muted/60 hover:text-foreground"
                    onClick={() => {
                      setEmployerName(ex.name);
                      setEmployerNotes(ex.notes);
                      setShowClientExamples(false);
                    }}
                  >
                    <span className="font-medium text-foreground">{ex.name}</span>
                    <br />
                    {ex.notes}
                  </button>
                ))}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="employer">Client / Employer Name</Label>
              <Input
                id="employer"
                value={employerName}
                onChange={(e) => setEmployerName(e.target.value)}
                placeholder="e.g. Vogue Netherlands"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Client Notes</Label>
              <Textarea
                id="notes"
                value={employerNotes}
                onChange={(e) => setEmployerNotes(e.target.value)}
                placeholder="Requirements, deadlines, brand guidelines..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/dashboard/projects")}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={!name.trim() || saving} data-tour="new-project-submit">
            {saving ? "Creating..." : "Create Project"}
          </Button>
        </div>
      </form>
    </div>
  );
}
