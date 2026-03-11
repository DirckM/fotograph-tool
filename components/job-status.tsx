"use client";

import { useEffect, useState } from "react";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import type { Job } from "@/types";
import { cn } from "@/lib/utils";

interface JobStatusProps {
  jobId: string | null;
  onComplete: (job: Job) => void;
  className?: string;
}

export function JobStatus({ jobId, onComplete, className }: JobStatusProps) {
  const [status, setStatus] = useState<Job["status"] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) return;

    setStatus("processing");
    setError(null);

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/jobs/${jobId}`);
        if (!res.ok) throw new Error("Failed to fetch job status");

        const job: Job = await res.json();
        setStatus(job.status);

        if (job.status === "completed") {
          clearInterval(interval);
          onComplete(job);
        } else if (job.status === "failed") {
          clearInterval(interval);
          setError(job.error_message ?? "An unknown error occurred");
        }
      } catch {
        clearInterval(interval);
        setError("Failed to check job status");
        setStatus("failed");
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [jobId, onComplete]);

  if (!jobId || !status) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg border border-border p-3",
        status === "failed" && "border-destructive/50 bg-destructive/5",
        status === "completed" && "border-green-500/50 bg-green-500/5",
        className
      )}
    >
      {status === "processing" && (
        <>
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span className="text-sm">Processing your image...</span>
        </>
      )}
      {status === "failed" && (
        <>
          <AlertCircle className="h-4 w-4 text-destructive" />
          <span className="text-sm text-destructive">{error}</span>
        </>
      )}
      {status === "completed" && (
        <>
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <span className="text-sm text-green-500">Done</span>
        </>
      )}
    </div>
  );
}
