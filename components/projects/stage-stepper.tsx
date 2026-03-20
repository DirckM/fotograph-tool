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
    <div className="flex w-full items-start justify-between">
      {STAGE_NAMES.map((name, index) => {
        const stageNumber = index + 1;
        const isCompleted = stageNumber < currentStage;
        const isActive = stageNumber === currentStage;
        const isLocked = stageNumber > currentStage;
        const isClickable = !isLocked && onStageClick;
        const isLast = index === STAGE_NAMES.length - 1;

        return (
          <div key={stageNumber} className="flex flex-1 items-start">
            <div className="flex flex-col items-center gap-1.5">
              <button
                type="button"
                disabled={isLocked}
                onClick={isClickable ? () => onStageClick(stageNumber) : undefined}
                className={cn(
                  "relative flex size-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold transition-all",
                  isCompleted &&
                    "border-primary bg-primary text-primary-foreground",
                  isActive &&
                    "border-primary bg-primary text-primary-foreground ring-4 ring-primary/40 scale-110",
                  isLocked &&
                    "border-muted text-muted-foreground",
                  isClickable && "cursor-pointer hover:opacity-80",
                  isLocked && "cursor-default"
                )}
              >
                {isCompleted ? (
                  <Check className="size-4" />
                ) : (
                  stageNumber
                )}
              </button>
              <span
                className={cn(
                  "hidden text-center text-xs sm:block",
                  isCompleted && "font-medium text-foreground",
                  isActive && "font-semibold text-primary",
                  isLocked && "text-muted-foreground"
                )}
              >
                {name}
              </span>
            </div>

            {!isLast && (
              <div
                className={cn(
                  "mt-4 h-0.5 w-full shrink",
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
