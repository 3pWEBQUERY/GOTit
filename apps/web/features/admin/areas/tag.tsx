import { cn } from "@app/ui";
import type { ReactNode } from "react";

/** Kurzer Status in einer Tabelle. Der Text trägt die Bedeutung, der Rand nur die Tönung. */
export function Tag({ tone = "neutral", children }: { tone?: "neutral" | "success" | "warning" | "error"; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex min-h-6 items-center rounded-full border bg-surface px-2 text-label text-ink",
        tone === "neutral" && "border-border",
        tone === "success" && "border-success",
        tone === "warning" && "border-warning",
        tone === "error" && "border-error",
      )}
    >
      {children}
    </span>
  );
}
