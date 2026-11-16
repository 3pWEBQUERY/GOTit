"use client";

import { Check, Info, X } from "lucide-react";
import { Popover as PopoverPrimitive } from "radix-ui";
import type { ReactNode } from "react";
import { cn } from "../../cn";
import { IconButton } from "../actions/icon-button";

export interface TrustSignalExplanation {
  /** Was geprüft wurde. */
  checked: ReactNode;
  /** Wann geprüft wurde, als fertiger Text. */
  checkedAt: ReactNode;
  /** Was das Signal nicht aussagt. */
  notImplied: ReactNode;
}

export interface TrustSignal {
  key: string;
  /** Das Signal als Wort, zum Beispiel «Identität geprüft». */
  label: string;
  /** Zugänglicher Name des Info-Buttons, zum Beispiel «Erklärung zu Identität geprüft anzeigen». */
  infoLabel: string;
  explanation: TrustSignalExplanation;
}

export interface TrustSignalsUpdated {
  /** Relative Angabe, zum Beispiel «Aktualisiert vor 3 Tagen». */
  label: string;
  /** Das genaue Datum; erscheint als Tooltip des Browsers. */
  exact: string;
  /** Maschinenlesbares Datum (ISO). */
  dateTime?: string;
}

export interface TrustSignalsProps {
  /** Zugänglicher Name der Liste. */
  label: string;
  signals: readonly TrustSignal[];
  /** Zwischentitel der drei Teile der Erklärung. */
  explanationLabels: { checked: string; checkedAt: string; notImplied: string };
  /** Zugänglicher Name des Buttons, der die Erklärung schliesst. */
  closeLabel: string;
  updated?: TrustSignalsUpdated;
  className?: string;
}

/**
 * Vertrauenssignale der Profilseite (PRD 10.1): getrennt untereinander, jedes
 * mit eigener Erklärung, was geprüft wurde, wann, und was es nicht aussagt.
 * Neutral in Tinte auf Fläche; kein Sammelabzeichen, kein Tarif-Kennzeichen.
 */
export function TrustSignals({ label, signals, explanationLabels, closeLabel, updated, className }: TrustSignalsProps) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <ul aria-label={label} className="flex flex-col">
        {signals.map((signal) => (
          <li key={signal.key} className="flex min-h-11 items-center gap-2 text-ink">
            <Check aria-hidden strokeWidth={1.5} className="size-5 shrink-0" />
            <span className="min-w-0 flex-1 text-body">{signal.label}</span>
            <PopoverPrimitive.Root>
              <PopoverPrimitive.Trigger asChild>
                <IconButton label={signal.infoLabel} icon={<Info strokeWidth={1.5} />} className="text-ink-muted" />
              </PopoverPrimitive.Trigger>
              <PopoverPrimitive.Portal>
                <PopoverPrimitive.Content
                  align="end"
                  sideOffset={4}
                  collisionPadding={8}
                  aria-label={signal.label}
                  className="z-50 w-80 max-w-(--radix-popover-content-available-width) animate-layer-in rounded-control border border-border bg-surface p-4 text-ink shadow-raised"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="py-2 text-small font-[550]">{signal.label}</p>
                    <PopoverPrimitive.Close asChild>
                      <IconButton label={closeLabel} icon={<X strokeWidth={1.5} />} className="-mt-1 -mr-2" />
                    </PopoverPrimitive.Close>
                  </div>
                  <dl className="flex flex-col gap-3 text-small">
                    <div className="flex flex-col gap-1">
                      <dt className="text-label text-ink-muted">{explanationLabels.checked}</dt>
                      <dd>{signal.explanation.checked}</dd>
                    </div>
                    <div className="flex flex-col gap-1">
                      <dt className="text-label text-ink-muted">{explanationLabels.checkedAt}</dt>
                      <dd className="tabular">{signal.explanation.checkedAt}</dd>
                    </div>
                    <div className="flex flex-col gap-1">
                      <dt className="text-label text-ink-muted">{explanationLabels.notImplied}</dt>
                      <dd>{signal.explanation.notImplied}</dd>
                    </div>
                  </dl>
                </PopoverPrimitive.Content>
              </PopoverPrimitive.Portal>
            </PopoverPrimitive.Root>
          </li>
        ))}
      </ul>
      {updated ? (
        <p className="text-small text-ink-muted">
          <time dateTime={updated.dateTime} title={updated.exact}>
            {updated.label}
          </time>
        </p>
      ) : null}
    </div>
  );
}
