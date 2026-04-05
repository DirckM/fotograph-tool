import { cn } from "@/lib/utils";

interface DisabledTooltipProps {
  children: React.ReactNode;
  message?: string;
  className?: string;
}

export function DisabledTooltip({ children, message, className }: DisabledTooltipProps) {
  if (!message) return <>{children}</>;

  return (
    <div className={cn("group/tooltip relative", className)}>
      {children}
      <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-popover px-3 py-1.5 text-xs text-popover-foreground shadow-md opacity-0 transition-opacity group-hover/tooltip:opacity-100">
        {message}
      </div>
    </div>
  );
}
