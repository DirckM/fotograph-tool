"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { STAGE_NAMES } from "@/types";

interface StageStepperProps {
  currentStage: number;
  onStageClick?: (stage: number) => void;
}

export function StageStepper({ currentStage, onStageClick }: StageStepperProps) {
  return (
    <div className="flex items-center gap-0.5">
      {STAGE_NAMES.map((name, index) => {
        const stageNumber = index + 1;
        const isCompleted = stageNumber < currentStage;
        const isActive = stageNumber === currentStage;
        const isLocked = stageNumber > currentStage;
        const isClickable = !isLocked && onStageClick;
        const isLast = index === STAGE_NAMES.length - 1;

        return (
          <div key={stageNumber} className="flex items-center">
            <button
              type="button"
              disabled={isLocked}
              onClick={isClickable ? () => onStageClick(stageNumber) : undefined}
              className={cn(
                "relative flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold transition-all duration-200",
                isCompleted &&
                  "bg-primary text-primary-foreground",
                isActive &&
                  "bg-primary text-primary-foreground ring-2 ring-primary/40",
                isLocked &&
                  "bg-muted text-muted-foreground",
                isClickable && "cursor-pointer hover:opacity-80",
                isLocked && "cursor-default"
              )}
            >
              {isCompleted ? (
                <Check className="size-2.5" />
              ) : (
                stageNumber
              )}
            </button>

            {!isLast && (
              <div
                className={cn(
                  "h-px w-3 transition-colors duration-500",
                  isCompleted ? "bg-primary" : "bg-muted"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
