"use client";

import { cn } from "@/lib/utils";
import { StageGuide } from "@/components/projects/stage-guide";

interface StageLayoutProps {
  title: React.ReactNode;
  description?: string;
  guide?: string[];
  guideTip?: string;
  children: React.ReactNode;
  aside: React.ReactNode;
  footer?: React.ReactNode;
  contentKey?: string;
}

export function StageLayout({
  title,
  description,
  guide,
  guideTip,
  children,
  aside,
  footer,
  contentKey,
}: StageLayoutProps) {
  return (
    <div className="flex h-full flex-col overflow-hidden animate-in fade-in-0 duration-300">
      <div className="shrink-0 px-6 pt-4 pb-3 flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          {description && (
            <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {guide && <StageGuide items={guide} tip={guideTip} />}
      </div>

      <div className="min-h-0 flex-1 px-6 pb-4">
        <div className="grid h-full gap-6 lg:grid-cols-[1fr_380px]">
          <div
            key={contentKey ? `main-${contentKey}` : undefined}
            className={cn(
              "min-h-0 overflow-hidden flex flex-col",
              contentKey && "animate-in fade-in-0 duration-300"
            )}
          >
            {children}
          </div>

          <div className="min-h-0 overflow-y-auto flex flex-col gap-4 pr-1">
            {aside}
          </div>
        </div>
      </div>

      {footer && (
        <div className="shrink-0 border-t border-border/50 px-6 py-3 flex justify-end">
          {footer}
        </div>
      )}
    </div>
  );
}
