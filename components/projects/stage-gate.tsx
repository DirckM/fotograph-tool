"use client";

import { Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
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
    return <>{children}</>;
  }

  const previousStageName = STAGE_NAMES[requiredStage - 1] ?? "the previous stage";

  return (
    <Card>
      <CardContent>
        <div className="flex flex-col items-center justify-center gap-3 py-12 text-muted-foreground">
          <Lock className="h-8 w-8" />
          <p className="text-sm">
            Complete <span className="font-medium">{previousStageName}</span> to
            unlock this stage
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
