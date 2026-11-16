"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import type { KeyboardEvent, ReactNode } from "react";
import { cn } from "../../cn";
import { IconButton } from "../actions/icon-button";
import { MediaFrame, type MediaItem } from "./media-frame";

export interface LightboxLabels {
  /** Titel der Ansicht für Screenreader, zum Beispiel «Medien von Beispielname». */
  title: string;
  close: string;
  previous: string;
  next: string;
}

export interface LightboxProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: readonly MediaItem[];
  /** Stelle des gezeigten Mediums. */
  index: number;
  onIndexChange: (index: number) => void;
  labels: LightboxLabels;
  /** Zähler, zum Beispiel «3 / 18». Wird beim Wechsel vorgelesen. */
  counterLabel: (current: number, total: number) => string;
  /** Aktionen zum gezeigten Medium, zum Beispiel «Medium melden». */
  actions?: ReactNode | ((item: MediaItem, index: number) => ReactNode);
}

/**
 * Vollbild-Ansicht der Medien (PRD 10.1). Pfeil links und rechts wechseln das
 * Medium, Escape schliesst; der Fokus ist gefangen und kehrt zum Auslöser
 * zurück. Geschützte Medien zeigen die Bedingung statt eines Bilds.
 */
export function Lightbox({ open, onOpenChange, items, index, onIndexChange, labels, counterLabel, actions }: LightboxProps) {
  const last = items.length - 1;
  const safeIndex = Math.min(Math.max(index, 0), Math.max(last, 0));
  const item = items[safeIndex];
  const atStart = safeIndex <= 0;
  const atEnd = safeIndex >= last;

  function go(step: -1 | 1) {
    const next = safeIndex + step;
    if (next < 0 || next > last) return;
    onIndexChange(next);
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const target = event.target;
    if (target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return;
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      go(-1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      go(1);
    }
  }

  const stepButton = "aria-disabled:cursor-not-allowed aria-disabled:opacity-55";

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Content
          aria-describedby={undefined}
          onKeyDown={onKeyDown}
          className="fixed inset-0 z-50 flex animate-fade-in flex-col bg-bg pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] text-ink"
        >
          <DialogPrimitive.Title className="sr-only">{labels.title}</DialogPrimitive.Title>
          <div className="flex shrink-0 flex-wrap items-center gap-2 px-2 py-2 md:px-4">
            <p aria-live="polite" aria-atomic="true" className="tabular min-w-0 flex-1 px-2 text-small text-ink-muted">
              {item ? counterLabel(safeIndex + 1, items.length) : null}
              {item ? <span className="sr-only"> {item.locked ? item.locked.reason : item.alt}</span> : null}
            </p>
            {item ? <div className="flex flex-wrap items-center gap-2">{typeof actions === "function" ? actions(item, safeIndex) : actions}</div> : null}
            <DialogPrimitive.Close asChild>
              <IconButton label={labels.close} icon={<X strokeWidth={1.5} />} />
            </DialogPrimitive.Close>
          </div>
          <div className="flex min-h-0 flex-1 items-center gap-1 px-1 pb-4 md:gap-4 md:px-4">
            <IconButton
              variant="outlined"
              label={labels.previous}
              icon={<ChevronLeft strokeWidth={1.5} />}
              aria-disabled={atStart || undefined}
              onClick={() => go(-1)}
              className={stepButton}
            />
            <div className="flex h-full min-w-0 flex-1 items-center justify-center">
              {item ? (
                <MediaFrame
                  key={item.key}
                  item={item}
                  fit="contain"
                  eager
                  className={cn("rounded-card", item.src && !item.locked ? "bg-transparent" : "aspect-4/5 h-auto max-h-full w-full max-w-panel")}
                />
              ) : null}
            </div>
            <IconButton
              variant="outlined"
              label={labels.next}
              icon={<ChevronRight strokeWidth={1.5} />}
              aria-disabled={atEnd || undefined}
              onClick={() => go(1)}
              className={stepButton}
            />
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
