"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { HistoryCard } from "@/components/history-card";
import { createClient } from "@/lib/supabase/client";
import type { Job } from "@/types";
import { History, Download, Wand2, RotateCcw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const featureRoutes: Record<string, string> = {
  upscale: "/dashboard/upscale",
  face_swap: "/dashboard/face-swap",
  try_on: "/dashboard/try-on",
  consistency: "/dashboard/consistency",
  adjust: "/dashboard/adjust",
  generate_perspective: "/dashboard/face-swap",
};

const featureLabels: Record<string, string> = {
  upscale: "Upscale",
  face_swap: "Face Swap",
  try_on: "Try-On",
  consistency: "Consistency",
  adjust: "Adjust",
  generate_perspective: "Generate Perspective",
};

export default function HistoryPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    async function fetchJobs() {
      const { data } = await supabase
        .from("jobs")
        .select("*")
        .order("created_at", { ascending: false });

      setJobs(data ?? []);
      setLoading(false);
    }

    fetchJobs();
  }, []);

  const handleDownload = useCallback(async (job: Job) => {
    if (!job.result_image) return;
    const response = await fetch(job.result_image);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fotograph-${job.feature}-${job.id}.png`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleAdjust = useCallback((job: Job) => {
    if (!job.result_image) return;
    setSelectedJob(null);
    router.push(`/dashboard/adjust?imageUrl=${encodeURIComponent(job.result_image)}`);
  }, [router]);

  const handleRedo = useCallback((job: Job) => {
    setSelectedJob(null);
    router.push(featureRoutes[job.feature] ?? "/dashboard");
  }, [router]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-medium">
          <History className="h-5 w-5" />
          Job <span className="font-serif">History</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          All your previous image processing jobs.
        </p>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading...</div>
      ) : jobs.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <History className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">No jobs yet. Start by processing an image.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {jobs.map((job) => (
            <HistoryCard key={job.id} job={job} onClick={() => setSelectedJob(job)} />
          ))}
        </div>
      )}

      <Dialog open={!!selectedJob} onOpenChange={(open) => { if (!open) setSelectedJob(null); }}>
        {selectedJob && (
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {featureLabels[selectedJob.feature] ?? selectedJob.feature}
                <Badge
                  variant={
                    selectedJob.status === "completed"
                      ? "default"
                      : selectedJob.status === "failed"
                      ? "destructive"
                      : "secondary"
                  }
                  className="text-[10px]"
                >
                  {selectedJob.status}
                </Badge>
              </DialogTitle>
              <p className="text-xs text-muted-foreground">
                {new Date(selectedJob.created_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </DialogHeader>

            {selectedJob.result_image ? (
              <div className="overflow-hidden rounded-lg border border-border">
                <img
                  src={selectedJob.result_image}
                  alt="Result"
                  className="w-full object-contain"
                />
              </div>
            ) : (
              <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
                {selectedJob.status === "failed"
                  ? (selectedJob.error_message ?? "Processing failed")
                  : "Processing..."}
              </div>
            )}

            <div className="grid grid-cols-3 gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!selectedJob.result_image}
                onClick={() => handleDownload(selectedJob)}
              >
                <Download className="mr-1.5 h-3.5 w-3.5" />
                Download
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!selectedJob.result_image}
                onClick={() => handleAdjust(selectedJob)}
              >
                <Wand2 className="mr-1.5 h-3.5 w-3.5" />
                Adjust
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleRedo(selectedJob)}
              >
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                Redo
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
