import type { ReportPriority } from "@app/db";
import { cn } from "@app/ui";
import { ArrowDown, ChevronsUp, ShieldAlert } from "lucide-react";

/**
 * Priorität als Wort mit Icon, nie nur als Farbe (v2 12.4). «Kritisch»
 * nennt dazu, wer entscheidet: «Kritisch · Trust & Safety».
 */
export function PriorityBadge({ priority, label }: { priority: ReportPriority; label: string }) {
  const icon =
    priority === "CRITICAL" ? (
      <ShieldAlert aria-hidden strokeWidth={1.5} className="size-4 shrink-0" />
    ) : priority === "HIGH" ? (
      <ChevronsUp aria-hidden strokeWidth={1.5} className="size-4 shrink-0" />
    ) : priority === "LOW" ? (
      <ArrowDown aria-hidden strokeWidth={1.5} className="size-4 shrink-0" />
    ) : null;
  return (
    <span
      data-priority={priority}
      className={cn(
        "inline-flex items-center gap-1 text-small whitespace-nowrap",
        priority === "CRITICAL" && "rounded-chip border border-error px-1 font-[550] text-error",
        priority === "HIGH" && "font-[550] text-ink",
        priority === "NORMAL" && "text-ink",
        priority === "LOW" && "text-ink-muted",
      )}
    >
      {icon}
      {label}
    </span>
  );
}
