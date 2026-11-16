import { Check } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "../../cn";
import { UiLink } from "../../link/ui-link";

export type ProgressStepState = "done" | "current" | "upcoming";

export interface ProgressStep {
  id: string;
  label: string;
  state: ProgressStepState;
  /** Macht den Schritt zum Link, zum Beispiel zurück zu einem erledigten Schritt. */
  href?: string;
}

export interface ProgressStepsProps {
  /** Zugänglicher Name der Schrittfolge («Fortschritt der Profilerstellung»). */
  label: string;
  steps: ProgressStep[];
  /** Kompakte Zeile unter 768 px, fertig formatiert: «Schritt 2 von 8: Name». */
  summary: ReactNode;
  /** Status in Worten für Screenreader. */
  labels: Record<ProgressStepState, string>;
  className?: string;
}

const bar: Record<ProgressStepState, string> = { done: "bg-ink", current: "bg-accent", upcoming: "bg-border" };

const marker: Record<ProgressStepState, string> = {
  done: "border-ink bg-ink text-bg",
  current: "border-accent text-accent",
  upcoming: "border-border-strong text-ink-muted",
};

/**
 * Schritte eines Ablaufs. Ab 768 px nebeneinander mit Namen, darunter kompakt
 * als eine Zeile mit Balken. Der Status steht als Icon, Zahl und Text da, nie nur als Farbe.
 */
export function ProgressSteps({ label, steps, summary, labels, className }: ProgressStepsProps) {
  return (
    <nav aria-label={label} className={cn("text-ink", className)}>
      <div className="flex flex-col gap-2 md:hidden">
        <p className="tabular text-small font-[550]">{summary}</p>
        <div aria-hidden className="flex gap-1">
          {steps.map((step) => (
            <span key={step.id} className={cn("h-1 flex-1 rounded-full", bar[step.state])} />
          ))}
        </div>
      </div>
      <ol className="hidden gap-2 md:flex">
        {steps.map((step, index) => {
          const content = (
            <>
              <span className={cn("tabular flex size-6 shrink-0 items-center justify-center rounded-full border text-label", marker[step.state])}>
                {step.state === "done" ? <Check aria-hidden strokeWidth={1.5} className="size-4" /> : index + 1}
              </span>
              <span className={cn("min-w-0 text-small", step.state === "current" && "font-[550]", step.state === "upcoming" && "text-ink-muted")}>
                {step.label}
              </span>
              <span className="sr-only">{labels[step.state]}</span>
            </>
          );
          const row = "flex min-h-11 items-center gap-2";
          return (
            <li key={step.id} aria-current={step.state === "current" ? "step" : undefined} className="flex min-w-0 flex-1 flex-col gap-1">
              <span aria-hidden className={cn("h-1 rounded-full", bar[step.state])} />
              {step.href ? (
                <UiLink href={step.href} className={cn(row, "rounded-chip hover:underline")}>
                  {content}
                </UiLink>
              ) : (
                <span className={row}>{content}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
