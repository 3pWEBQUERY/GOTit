"use client";

import { useEffect, useState, type ReactNode } from "react";
import { cn } from "../../cn";

export interface LoadingRegionProps {
  /** Wird vorgelesen, solange geladen wird («Profile werden geladen»). */
  label: string;
  /** Die Skelette in der Form des Inhalts. */
  children: ReactNode;
  /** Erscheint, wenn das Laden zu lange dauert: ein Satz und «Erneut versuchen». */
  slowFallback?: ReactNode;
  /** Verzögerung, bevor Skelette erscheinen. Schnelle Antworten flackern so nicht. */
  delayMs?: number;
  slowAfterMs?: number;
  className?: string;
}

/**
 * Rahmen für einen ladenden Bereich (PRD 13): Skelette erst nach 150 ms, nach
 * 8 Sekunden zusätzlich ein Hinweis mit Ausweg. Wird entfernt, sobald der Inhalt da ist.
 */
export function LoadingRegion({ label, children, slowFallback, delayMs = 150, slowAfterMs = 8000, className }: LoadingRegionProps) {
  const [phase, setPhase] = useState<"waiting" | "visible" | "slow">(delayMs <= 0 ? "visible" : "waiting");

  useEffect(() => {
    const visible = window.setTimeout(() => setPhase((current) => (current === "waiting" ? "visible" : current)), delayMs);
    const slow = window.setTimeout(() => setPhase("slow"), slowAfterMs);
    return () => {
      window.clearTimeout(visible);
      window.clearTimeout(slow);
    };
  }, [delayMs, slowAfterMs]);

  return (
    <div aria-busy="true" data-phase={phase} className={cn("flex flex-col gap-4", className)}>
      <span role="status" className="sr-only">
        {label}
      </span>
      {phase === "slow" && slowFallback ? <div role="status">{slowFallback}</div> : null}
      {phase === "waiting" ? null : children}
    </div>
  );
}
