"use client";

import type { SwitchStatus } from "@app/ui";
import { cn } from "@app/ui";
import { Check, CircleAlert, LoaderCircle } from "lucide-react";

const tone: Record<SwitchStatus, string> = { idle: "", saving: "text-ink-muted", saved: "text-success", error: "text-error" };

/** Bestätigung am Ort für Auswahlfelder, die sofort speichern; dieselbe Form wie am Switch. */
export function SaveStatus({ status, label }: { status: SwitchStatus; label?: string }) {
  return (
    <p aria-live="polite" className={cn("flex min-h-5 items-center gap-1 text-small", tone[status])}>
      {status !== "idle" && label ? (
        <>
          {status === "saving" ? <LoaderCircle aria-hidden strokeWidth={1.5} className="size-[1.125rem] shrink-0 animate-spin" /> : null}
          {status === "saved" ? <Check aria-hidden strokeWidth={1.5} className="size-[1.125rem] shrink-0" /> : null}
          {status === "error" ? <CircleAlert aria-hidden strokeWidth={1.5} className="size-[1.125rem] shrink-0" /> : null}
          <span>{label}</span>
        </>
      ) : null}
    </p>
  );
}
