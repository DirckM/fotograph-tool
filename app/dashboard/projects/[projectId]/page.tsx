"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

const STAGE_PATHS = ["context", "model", "environment", "pose", "garment", "final"];

export default function ProjectRedirectPage() {
  const params = useParams<{ projectId: string }>();
  const router = useRouter();

  useEffect(() => {
    async function redirect() {
      const res = await fetch(`/api/projects/${params.projectId}`);
      if (res.ok) {
        const project = await res.json();
        const path = STAGE_PATHS[project.current_stage] ?? "context";
        router.replace(
          `/dashboard/projects/${params.projectId}/${path}`
        );
      } else {
        router.replace("/dashboard/projects");
      }
    }
    redirect();
  }, [params.projectId, router]);

  return (
    <div className="flex h-64 items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}
