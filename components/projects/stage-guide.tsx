"use client";

import { useState } from "react";
import { HelpCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface StageGuideProps {
  items: string[];
  tip?: string;
  className?: string;
}

export function StageGuide({ items, tip, className }: StageGuideProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className={cn("relative", className)}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-muted-foreground hover:text-foreground"
        onClick={() => setOpen((v) => !v)}
      >
        <HelpCircle className="h-4 w-4" />
      </Button>

      {open && (
        <div className="absolute right-0 top-9 z-50 w-96 rounded-lg border border-border bg-popover p-4 shadow-lg">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-medium">How to use this page</span>
            <button
              onClick={() => setOpen(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <ol className="space-y-2 text-sm text-muted-foreground">
            {items.map((item, i) => (
              <li key={i} className="flex gap-2">
                <span className="shrink-0 font-medium text-foreground">{i + 1}.</span>
                {item}
              </li>
            ))}
          </ol>
          {tip && (
            <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
              {tip}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
