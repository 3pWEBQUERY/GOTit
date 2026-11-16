"use client";

import { Check, CircleAlert, LoaderCircle } from "lucide-react";
import { Switch as SwitchPrimitive } from "radix-ui";
import { useId, type ReactNode, type Ref } from "react";
import { cn } from "../../cn";

export type SwitchStatus = "idle" | "saving" | "saved" | "error";

export interface SwitchProps {
  label: ReactNode;
  description?: ReactNode;
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  /** Für Einstellungen, die sofort speichern: Zustand des Speicherns, am Ort bestätigt (PRD 13). */
  status?: SwitchStatus;
  /** Text zum aktuellen `status`, zum Beispiel «Gespeichert». Wird über eine Live-Region vorgelesen. */
  statusLabel?: string;
  name?: string;
  value?: string;
  disabled?: boolean;
  id?: string;
  ref?: Ref<HTMLButtonElement>;
  className?: string;
}

const statusClass: Record<Exclude<SwitchStatus, "idle">, string> = {
  saving: "text-ink-muted",
  saved: "text-success",
  error: "text-error",
};

/** Schalter für eine Einstellung, die sofort gilt. Nicht mit einem Speichern-Button im selben Formular mischen. */
export function Switch({ label, description, status: statusProp, statusLabel, id, className, ...props }: SwitchProps) {
  const status = statusProp ?? "idle";
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const descriptionId = description ? `${controlId}-description` : undefined;
  const showStatus = status !== "idle" && Boolean(statusLabel);

  return (
    <div className={cn("flex min-w-0 flex-col gap-1", className)}>
      <div className="flex items-start justify-between gap-4 py-3">
        <div className="flex min-w-0 flex-col gap-1">
          <label htmlFor={controlId} className={cn("text-body text-ink", props.disabled && "text-ink-muted")}>
            {label}
          </label>
          {description && descriptionId ? (
            <p id={descriptionId} className="text-small text-ink-muted">
              {description}
            </p>
          ) : null}
        </div>
        <SwitchPrimitive.Root
          {...props}
          id={controlId}
          aria-describedby={descriptionId}
          aria-busy={status === "saving" || undefined}
          className={cn(
            "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border border-border-strong bg-surface-2 px-px",
            "transition-colors duration-state before:absolute before:-inset-3 hover:border-ink",
            "data-[state=checked]:border-ink data-[state=checked]:bg-ink disabled:cursor-not-allowed disabled:opacity-55",
          )}
        >
          <SwitchPrimitive.Thumb className="block size-5 rounded-full border border-border-strong bg-surface transition-transform duration-state data-[state=checked]:translate-x-5 data-[state=checked]:border-transparent" />
        </SwitchPrimitive.Root>
      </div>
      <p aria-live="polite" className={cn("flex items-center gap-1 text-small", statusProp !== undefined && "min-h-5", status !== "idle" && statusClass[status])}>
        {showStatus ? (
          <>
            {status === "saving" ? <LoaderCircle aria-hidden strokeWidth={1.5} className="size-[1.125rem] shrink-0 animate-spin" /> : null}
            {status === "saved" ? <Check aria-hidden strokeWidth={1.5} className="size-[1.125rem] shrink-0" /> : null}
            {status === "error" ? <CircleAlert aria-hidden strokeWidth={1.5} className="size-[1.125rem] shrink-0" /> : null}
            <span>{statusLabel}</span>
          </>
        ) : null}
      </p>
    </div>
  );
}
