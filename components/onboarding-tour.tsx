"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  X,
  ArrowRight,
  ArrowLeft,
  Camera,
  Check,
  Sparkles,
  Rocket,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  TOUR_STEPS,
  ONBOARDING_STORAGE_KEY,
  type TourStep,
  type TourFeature,
  type StepAction,
} from "@/lib/onboarding-steps";
import {
  typeIntoReactInput,
  clickElement,
  waitForElement,
  delay,
  approveStage,
} from "@/lib/onboarding-demo";
import { createClient } from "@/lib/supabase/client";
import { MaskDemo } from "@/components/onboarding-mask-demo";

// -- Context --

interface OnboardingContextValue {
  startTour: () => void;
  isActive: boolean;
}

const OnboardingContext = createContext<OnboardingContextValue>({
  startTour: () => {},
  isActive: false,
});

export function useOnboarding() {
  return useContext(OnboardingContext);
}

// -- Action executor --

function getProjectIdFromUrl(): string | null {
  const match = window.location.pathname.match(
    /\/dashboard\/projects\/([^/]+)/
  );
  return match?.[1] ?? null;
}

function resolveNavigatePath(path: string): string {
  if (path) return path;
  // Empty path = navigate to the current project's next stage
  // Determined by the current URL context
  return window.location.pathname;
}

const STAGE_PATHS: Record<number, string> = {
  1: "model",
  2: "environment",
  3: "pose",
  4: "garment",
  5: "final",
};

async function executeActions(
  actions: StepAction[],
  navigate: (path: string) => void,
  signal: AbortSignal
): Promise<void> {
  for (const action of actions) {
    if (signal.aborted) return;

    switch (action.type) {
      case "navigate": {
        if (action.path) {
          navigate(action.path);
        }
        break;
      }
      case "typeInto":
        await typeIntoReactInput(
          action.selector,
          action.text,
          action.speed
        );
        break;
      case "click":
        await clickElement(action.selector);
        break;
      case "waitFor":
        await waitForElement(action.selector, action.timeout ?? 10000);
        break;
      case "delay":
        await delay(action.ms);
        break;
      case "pressEscape":
        document.dispatchEvent(
          new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
        );
        break;
      case "approveStage": {
        await approveStage(action.stage);
        // Navigate to the next stage
        const projectId = getProjectIdFromUrl();
        const nextStage = action.stage + 1;
        const stagePath = STAGE_PATHS[nextStage];
        if (projectId && stagePath) {
          navigate(`/dashboard/projects/${projectId}/${stagePath}`);
        }
        break;
      }
    }
  }
}

// -- Workflow stages visual --

function WorkflowStages({
  stages,
}: {
  stages: NonNullable<TourStep["stages"]>;
}) {
  return (
    <div className="mt-3 space-y-0">
      {stages.map((stage, i) => (
        <div key={stage.number} className="flex items-start gap-3">
          <div className="flex flex-col items-center">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">
              {stage.number}
            </div>
            {i < stages.length - 1 && (
              <div className="h-3 w-px bg-border/60" />
            )}
          </div>
          <div className="flex items-baseline gap-1.5 pb-1 pt-0.5">
            <span className="text-xs font-medium text-foreground">
              {stage.name}
            </span>
            <span className="text-[11px] text-muted-foreground">
              {stage.description}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// -- Feature list visual --

function TourFeatures({ features }: { features: TourFeature[] }) {
  return (
    <div className="mt-3 grid grid-cols-1 gap-1.5">
      {features.map((f) => (
        <div
          key={f.label}
          className="flex items-baseline gap-2 rounded-md bg-white/[0.03] px-2.5 py-1.5"
        >
          <span className="shrink-0 text-[11px] font-semibold text-white/70">
            {f.label}
          </span>
          <span className="text-[11px] text-white/35">{f.description}</span>
        </div>
      ))}
    </div>
  );
}

// -- Step icon --

function StepIcon({ type }: { type: NonNullable<TourStep["icon"]> }) {
  const config = {
    welcome: {
      bg: "bg-primary/10 ring-primary/20",
      icon: <Camera className="h-5 w-5 text-primary" />,
    },
    complete: {
      bg: "bg-emerald-500/10 ring-emerald-500/20",
      icon: <Sparkles className="h-5 w-5 text-emerald-400" />,
    },
    rocket: {
      bg: "bg-blue-500/10 ring-blue-500/20",
      icon: <Rocket className="h-5 w-5 text-blue-400" />,
    },
    stage: {
      bg: "bg-violet-500/10 ring-violet-500/20",
      icon: <Sparkles className="h-5 w-5 text-violet-400" />,
    },
  }[type];

  return (
    <div
      className={cn(
        "mb-4 flex h-10 w-10 items-center justify-center rounded-xl ring-1",
        config.bg
      )}
    >
      {config.icon}
    </div>
  );
}

// -- Spotlight overlay + tooltip --

function TourOverlay({
  step,
  stepIndex,
  totalSteps,
  onNext,
  onPrev,
  onClose,
}: {
  step: TourStep;
  stepIndex: number;
  totalSteps: number;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
}) {
  const router = useRouter();
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [animating, setAnimating] = useState(true);
  const [settingUp, setSettingUp] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController>(new AbortController());

  // Execute setup + animate actions on step change
  useEffect(() => {
    const abort = new AbortController();
    abortRef.current = abort;

    setAnimating(true);
    setSettingUp(!!step.setup?.length);

    (async () => {
      // Run setup (before tooltip visible)
      if (step.setup?.length) {
        await executeActions(
          step.setup,
          (path) => router.push(path),
          abort.signal
        );
        if (abort.signal.aborted) return;
        setSettingUp(false);
      }

      // Fade in tooltip
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (!abort.signal.aborted) setAnimating(false);
        });
      });

      // Small delay then run animate actions
      await delay(300);
      if (step.animate?.length && !abort.signal.aborted) {
        await executeActions(
          step.animate,
          (path) => router.push(path),
          abort.signal
        );
      }
    })();

    return () => abort.abort();
  }, [stepIndex, step, router]);

  // Track target element position
  useEffect(() => {
    if (!step.target || settingUp) {
      setTargetRect(null);
      return;
    }

    const selector =
      step.target.startsWith("#") ||
      step.target.startsWith(".") ||
      step.target.startsWith("[")
        ? step.target
        : `[data-tour="${step.target}"]`;

    const findAndTrack = () => {
      const el = document.querySelector(selector);
      if (!el) {
        setTargetRect(null);
        return;
      }

      const update = () => setTargetRect(el.getBoundingClientRect());
      update();

      window.addEventListener("resize", update);
      window.addEventListener("scroll", update, true);

      return () => {
        window.removeEventListener("resize", update);
        window.removeEventListener("scroll", update, true);
      };
    };

    // Retry finding element (it might appear after animate actions)
    let cleanup = findAndTrack();
    if (!cleanup) {
      const interval = setInterval(() => {
        cleanup = findAndTrack();
        if (cleanup) clearInterval(interval);
      }, 200);
      const timeout = setTimeout(() => clearInterval(interval), 5000);
      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
        cleanup?.();
      };
    }
    return cleanup;
  }, [step.target, settingUp, stepIndex]);

  const isCentered = !step.target || !targetRect;
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === totalSteps - 1;

  // Tooltip positioning with viewport clamping
  const tooltipStyle: React.CSSProperties = {};
  const tooltipHeight = 280;
  const tooltipWidth = 360;
  const viewportMargin = 16;

  if (!isCentered && targetRect) {
    const pad = 16;

    // Auto-flip: if preferred side doesn't have room, use the other
    let side = step.placement;
    if (side === "left" && targetRect.left < tooltipWidth + pad + viewportMargin) {
      side = "right";
    } else if (side === "right" && window.innerWidth - targetRect.right < tooltipWidth + pad + viewportMargin) {
      side = "left";
    } else if (side === "top" && targetRect.top < tooltipHeight + pad + viewportMargin) {
      side = "bottom";
    } else if (side === "bottom" && window.innerHeight - targetRect.bottom < tooltipHeight + pad + viewportMargin) {
      side = "top";
    }

    switch (side) {
      case "right": {
        tooltipStyle.left = Math.min(
          targetRect.right + pad,
          window.innerWidth - tooltipWidth - viewportMargin
        );
        const idealTop =
          targetRect.top + targetRect.height / 2 - tooltipHeight / 2;
        tooltipStyle.top = Math.max(
          viewportMargin,
          Math.min(
            idealTop,
            window.innerHeight - tooltipHeight - viewportMargin
          )
        );
        break;
      }
      case "left": {
        const leftPos = targetRect.left - pad - tooltipWidth;
        tooltipStyle.left = Math.max(viewportMargin, leftPos);
        const idealTop =
          targetRect.top + targetRect.height / 2 - tooltipHeight / 2;
        tooltipStyle.top = Math.max(
          viewportMargin,
          Math.min(
            idealTop,
            window.innerHeight - tooltipHeight - viewportMargin
          )
        );
        break;
      }
      case "bottom": {
        const idealLeft =
          targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
        tooltipStyle.left = Math.max(
          viewportMargin,
          Math.min(
            idealLeft,
            window.innerWidth - tooltipWidth - viewportMargin
          )
        );
        tooltipStyle.top = targetRect.bottom + pad;
        break;
      }
      case "top": {
        const idealLeft =
          targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
        tooltipStyle.left = Math.max(
          viewportMargin,
          Math.min(
            idealLeft,
            window.innerWidth - tooltipWidth - viewportMargin
          )
        );
        tooltipStyle.bottom =
          window.innerHeight - targetRect.top + pad;
        break;
      }
    }
  }

  const clipPath = targetRect
    ? `polygon(
        0% 0%, 0% 100%, 100% 100%, 100% 0%, 0% 0%,
        ${targetRect.left - 8}px ${targetRect.top - 8}px,
        ${targetRect.right + 8}px ${targetRect.top - 8}px,
        ${targetRect.right + 8}px ${targetRect.bottom + 8}px,
        ${targetRect.left - 8}px ${targetRect.bottom + 8}px,
        ${targetRect.left - 8}px ${targetRect.top - 8}px
      )`
    : undefined;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (settingUp) return;
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" || e.key === "Enter") onNext();
      if (e.key === "ArrowLeft" && !isFirst) onPrev();
    },
    [onClose, onNext, onPrev, isFirst, settingUp]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Show loading screen during setup
  if (settingUp) {
    return createPortal(
      <div className="fixed inset-0 z-[9999]">
        <div className="absolute inset-0 bg-black/65 backdrop-blur-[2px]" />
        <div className="absolute left-1/2 top-1/2 z-[10000] flex -translate-x-1/2 -translate-y-1/2 items-center gap-3 rounded-xl border border-white/[0.08] bg-[#1a1a1f] px-6 py-4 shadow-2xl">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span className="text-sm text-white/60">Setting up...</span>
        </div>
      </div>,
      document.body
    );
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999]">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/65 backdrop-blur-[2px] transition-all duration-300"
        style={clipPath ? { clipPath } : undefined}
        onClick={onClose}
      />

      {/* Spotlight glow */}
      {targetRect && (
        <div
          className="pointer-events-none absolute rounded-lg ring-1 ring-primary/40 shadow-[0_0_20px_rgba(255,255,255,0.06)] transition-all duration-300"
          style={{
            left: targetRect.left - 8,
            top: targetRect.top - 8,
            width: targetRect.width + 16,
            height: targetRect.height + 16,
          }}
        />
      )}

      {/* Card */}
      <div
        ref={tooltipRef}
        className={cn(
          "absolute z-[10000] w-[360px] max-h-[85vh] overflow-hidden rounded-2xl border border-white/[0.08] bg-[#1a1a1f] shadow-[0_24px_80px_rgba(0,0,0,0.5)] transition-all duration-200",
          isCentered &&
            "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
          animating ? "scale-95 opacity-0" : "scale-100 opacity-100"
        )}
        style={isCentered ? undefined : tooltipStyle}
      >
        {/* Top accent */}
        <div className="h-px w-full bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

        <div className="overflow-y-auto p-5" style={{ maxHeight: "calc(85vh - 2px)" }}>
          {/* Close */}
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3.5 top-3.5 rounded-md p-1 text-white/30 transition-colors hover:bg-white/5 hover:text-white/60"
          >
            <X className="h-3.5 w-3.5" />
          </button>

          {/* Icon */}
          {step.icon && <StepIcon type={step.icon} />}

          {/* Title */}
          <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-white">
            {step.title}
          </h3>
          {step.subtitle && (
            <p className="mt-0.5 text-xs text-white/40">
              {step.subtitle}
            </p>
          )}

          {/* Content */}
          <p className="mt-2.5 text-[13px] leading-relaxed text-white/55">
            {step.content}
          </p>

          {/* Workflow stages */}
          {step.stages && <WorkflowStages stages={step.stages} />}

          {/* Feature list */}
          {step.features && <TourFeatures features={step.features} />}

          {/* Demo animation */}
          {step.demo === "mask" && <MaskDemo />}

          {/* Footer */}
          <div className="mt-5 flex items-center justify-between">
            {/* Progress */}
            <span className="text-[11px] tabular-nums text-white/30">
              {stepIndex + 1} / {totalSteps}
            </span>

            {/* Buttons */}
            <div className="flex items-center gap-2">
              {isFirst ? (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-2 py-1 text-[12px] text-white/30 transition-colors hover:text-white/50"
                >
                  Skip
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onPrev}
                  className="flex h-8 items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 text-[12px] font-medium text-white/60 transition-all hover:bg-white/[0.08] hover:text-white/80"
                >
                  <ArrowLeft className="h-3 w-3" />
                  Back
                </button>
              )}
              <button
                type="button"
                onClick={onNext}
                className={cn(
                  "flex h-8 items-center gap-1.5 rounded-lg px-4 text-[12px] font-medium transition-all",
                  isLast
                    ? "bg-emerald-500/90 text-white hover:bg-emerald-500"
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                )}
              >
                {isLast ? (
                  <>
                    Get started
                    <Check className="h-3 w-3" />
                  </>
                ) : (
                  <>
                    Next
                    <ArrowRight className="h-3 w-3" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

// -- Provider --

export function OnboardingProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [active, setActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const completed = localStorage.getItem(ONBOARDING_STORAGE_KEY);
    if (!completed) {
      const timer = setTimeout(() => {
        setActive(true);
        setCurrentStep(0);
      }, 800);
      setChecked(true);
      return () => clearTimeout(timer);
    }
    setChecked(true);
  }, []);

  const markCompleted = useCallback(() => {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase
          .from("profiles")
          .update({ onboarding_completed: true })
          .eq("id", user.id)
          .then(() => {});
      }
    });
  }, []);

  const startTour = useCallback(() => {
    setCurrentStep(0);
    setActive(true);
  }, []);

  const handleNext = useCallback(() => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      setActive(false);
      markCompleted();
    }
  }, [currentStep, markCompleted]);

  const handlePrev = useCallback(() => {
    if (currentStep > 0) setCurrentStep((s) => s - 1);
  }, [currentStep]);

  const handleClose = useCallback(() => {
    setActive(false);
    markCompleted();
  }, [markCompleted]);

  if (!checked) return <>{children}</>;

  return (
    <OnboardingContext.Provider value={{ startTour, isActive: active }}>
      {children}
      {active && (
        <TourOverlay
          step={TOUR_STEPS[currentStep]}
          stepIndex={currentStep}
          totalSteps={TOUR_STEPS.length}
          onNext={handleNext}
          onPrev={handlePrev}
          onClose={handleClose}
        />
      )}
    </OnboardingContext.Provider>
  );
}
