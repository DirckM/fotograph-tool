"use client";

import { Lock } from "lucide-react";
import { STAGE_NAMES } from "@/types";

interface StageGateProps {
  currentStage: number;
  requiredStage: number;
  children: React.ReactNode;
}

export function StageGate({
  currentStage,
  requiredStage,
  children,
}: StageGateProps) {
  if (requiredStage <= currentStage) {
    return (
      <div className="h-full animate-in fade-in-0 slide-in-from-bottom-2 duration-400">
        {children}
      </div>
    );
  }

  const previousStageName = STAGE_NAMES[requiredStage - 1] ?? "the previous stage";

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground animate-in fade-in-0 duration-300">
      <Lock className="h-8 w-8" />
      <p className="text-sm">
        Complete <span className="font-medium">{previousStageName}</span> to
        unlock this stage
      </p>
    </div>
  );
}
