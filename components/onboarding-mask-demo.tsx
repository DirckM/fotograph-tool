"use client";

import { useEffect, useState } from "react";

export function MaskDemo() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 400),
      setTimeout(() => setPhase(2), 1600),
      setTimeout(() => setPhase(3), 2800),
      setTimeout(() => setPhase(4), 3800),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="mt-3 flex items-center gap-3 rounded-lg bg-white/[0.03] p-3">
      {/* Fake image with mask overlay */}
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-white/10 to-white/5">
        {/* Face silhouette */}
        <div className="absolute inset-0 flex items-center justify-center">
          <svg viewBox="0 0 40 40" className="h-14 w-14 text-white/15">
            <ellipse cx="20" cy="16" rx="10" ry="12" fill="currentColor" />
            <ellipse cx="20" cy="30" rx="14" ry="10" fill="currentColor" />
          </svg>
        </div>

        {/* Animated mask brush stroke */}
        <svg
          viewBox="0 0 80 80"
          className="absolute inset-0 h-full w-full"
        >
          <path
            d="M 20 25 Q 30 20, 40 25 Q 50 30, 60 25"
            fill="none"
            stroke="rgba(59, 130, 246, 0.6)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray="80"
            strokeDashoffset={phase >= 1 ? "0" : "80"}
            style={{ transition: "stroke-dashoffset 1s ease-out" }}
          />
          <path
            d="M 22 35 Q 35 30, 55 35"
            fill="none"
            stroke="rgba(59, 130, 246, 0.4)"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray="60"
            strokeDashoffset={phase >= 2 ? "0" : "60"}
            style={{ transition: "stroke-dashoffset 0.8s ease-out" }}
          />
        </svg>
      </div>

      {/* Step labels */}
      <div className="flex-1 space-y-1.5">
        <Step
          n={1}
          label="Paint mask"
          desc="Select area to change"
          active={phase >= 1}
          done={phase >= 3}
        />
        <Step
          n={2}
          label="Describe change"
          desc='"Make eyes brighter"'
          active={phase >= 2}
          done={phase >= 4}
        />
        <Step
          n={3}
          label="AI refines"
          desc="Only masked area changes"
          active={phase >= 3}
          done={phase >= 4}
        />
      </div>
    </div>
  );
}

function Step({
  n,
  label,
  desc,
  active,
  done,
}: {
  n: number;
  label: string;
  desc: string;
  active: boolean;
  done: boolean;
}) {
  return (
    <div
      className="flex items-center gap-2 transition-opacity duration-300"
      style={{ opacity: active ? 1 : 0.25 }}
    >
      <div
        className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[8px] font-bold transition-colors duration-300"
        style={{
          background: done
            ? "rgba(52, 211, 153, 0.2)"
            : active
              ? "rgba(59, 130, 246, 0.2)"
              : "rgba(255, 255, 255, 0.05)",
          color: done
            ? "rgb(52, 211, 153)"
            : active
              ? "rgb(96, 165, 250)"
              : "rgba(255, 255, 255, 0.3)",
        }}
      >
        {done ? "\u2713" : n}
      </div>
      <div>
        <span className="text-[11px] font-medium text-white/60">{label}</span>
        <span className="ml-1 text-[10px] text-white/30">{desc}</span>
      </div>
    </div>
  );
}
