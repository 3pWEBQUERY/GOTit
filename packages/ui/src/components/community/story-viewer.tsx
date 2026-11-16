"use client";

import { ChevronLeft, ChevronRight, Flag, Pause, Play, X } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "../../cn";
import { UiLink } from "../../link/ui-link";
import { Button } from "../actions/button";
import { IconButton } from "../actions/icon-button";
import { AuthorAvatar, type CommunityAuthor } from "./author-avatar";
import { useReducedMotion } from "./use-reduced-motion";
import { useStoryProgress } from "./use-story-progress";

export interface StoryPart {
  id: string;
  /** Eigener Inhalt des Teils. Videos starten nie von selbst. */
  content?: ReactNode;
  /** Bild mit Alternativtext, wenn kein `content` gesetzt ist. */
  image?: { src: string; alt: string };
  /** Dauer dieses Teils in Millisekunden. */
  durationMs?: number;
}

export interface StoryViewerLabels {
  close: string;
  /** Zum Beispiel «Story melden». Immer sichtbar. */
  report: string;
  previous: string;
  next: string;
  pause: string;
  resume: string;
  /** Position als Text, zum Beispiel `(current, total) => `Teil ${current} von ${total}``. */
  position: (current: number, total: number) => string;
}

export interface StoryViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Zugänglicher Name des Dialogs, zum Beispiel «Story von Beispielname». */
  title: string;
  author: CommunityAuthor;
  /** Zeit als Text, zum Beispiel «vor 2 Stunden». */
  time: string;
  /** Genaues Datum für den Tooltip. */
  exactTime: string;
  dateTime?: string;
  parts: readonly StoryPart[];
  labels: StoryViewerLabels;
  onReport: (part: StoryPart, index: number) => void;
  /** Dauer je Teil in Millisekunden, wenn der Teil keine eigene nennt. Standard: 5 Sekunden. */
  durationMs?: number;
  initialIndex?: number;
  /** Nach dem letzten Teil. Ohne Angabe schliesst der Viewer. */
  onComplete?: () => void;
}

/**
 * Vollbild-Ansicht einer Story (PRD 12.3) auf Radix Dialog. Pfeil links und rechts blättern,
 * die Leertaste hält an und setzt fort, Escape schliesst, Halten pausiert. «Melden» ist immer
 * sichtbar. Bei reduzierter Bewegung läuft nichts von selbst weiter.
 */
export function StoryViewer({ open, onOpenChange, ...content }: StoryViewerProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <StoryViewerContent {...content} onClose={() => onOpenChange(false)} />
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

interface StoryViewerContentProps extends Omit<StoryViewerProps, "open" | "onOpenChange"> {
  onClose: () => void;
}

/** Inhalt des Viewers. Lebt nur, solange der Dialog offen ist; jeder Start beginnt beim gewählten Teil. */
function StoryViewerContent({ title, author, time, exactTime, dateTime, parts, labels, onReport, durationMs, initialIndex, onComplete, onClose }: StoryViewerContentProps) {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const [holding, setHolding] = useState(false);
  const reducedMotion = useReducedMotion();
  const progress = useStoryProgress({
    count: parts.length,
    durations: parts.map((part) => part.durationMs),
    defaultDuration: durationMs,
    autoAdvance: !reducedMotion,
    holding,
    initialIndex,
    onComplete: onComplete ?? onClose,
  });
  const part = parts[progress.index];

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      progress.next();
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      progress.previous();
    } else if (event.key === " " && !reducedMotion) {
      // Auf einem Button oder Link löst die Leertaste dessen Aktion aus.
      if (event.target instanceof Element && event.target.closest("button, a, input, textarea")) return;
      event.preventDefault();
      progress.toggle();
    }
  };

  return (
    <DialogPrimitive.Content
      ref={surfaceRef}
      aria-describedby={undefined}
      onKeyDown={handleKeyDown}
      onOpenAutoFocus={(event) => {
        // Der Fokus liegt auf der Fläche, damit die Leertaste sofort anhält.
        event.preventDefault();
        surfaceRef.current?.focus();
      }}
      className="fixed inset-0 z-50 flex animate-fade-in justify-center bg-bg text-ink"
    >
      <div className="flex w-full max-w-panel flex-col gap-3 p-4">
        <DialogPrimitive.Title className="sr-only">{title}</DialogPrimitive.Title>
        <div aria-hidden className="flex gap-1">
          {parts.map((item, index) => (
            <span key={item.id} className="h-1 flex-1 overflow-hidden rounded-full bg-border">
              <span
                className={cn("block h-full bg-ink", index === progress.index && "transition-[width] duration-100 ease-linear")}
                style={{ width: `${(index < progress.index ? 1 : index === progress.index ? progress.fraction : 0) * 100}%` }}
              />
            </span>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <AuthorAvatar initials={author.initials} src={author.avatarSrc} />
          <div className="flex min-w-0 flex-1 flex-col">
            {author.href ? (
              <UiLink href={author.href} className="text-body font-[600] text-ink underline-offset-4 hover:underline">
                {author.name}
              </UiLink>
            ) : (
              <span className="text-body font-[600] text-ink">{author.name}</span>
            )}
            <span className="text-small text-ink-muted">
              <time dateTime={dateTime} title={exactTime}>
                {time}
              </time>
              <span aria-hidden> · </span>
              <span aria-live="polite" className="tabular">
                {labels.position(progress.index + 1, parts.length)}
              </span>
            </span>
          </div>
          <DialogPrimitive.Close asChild>
            <IconButton label={labels.close} icon={<X strokeWidth={1.5} />} />
          </DialogPrimitive.Close>
        </div>
        <div
          data-holding={holding || undefined}
          onPointerDown={() => setHolding(true)}
          onPointerUp={() => setHolding(false)}
          onPointerCancel={() => setHolding(false)}
          onPointerLeave={() => setHolding(false)}
          className="flex min-h-0 flex-1 touch-none items-center justify-center overflow-hidden rounded-card bg-surface-2 select-none"
        >
          {part?.content ?? (part?.image ? <img src={part.image.src} alt={part.image.alt} draggable={false} className="max-h-full max-w-full object-contain" /> : null)}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <IconButton label={labels.previous} icon={<ChevronLeft strokeWidth={1.5} />} variant="outlined" aria-disabled={progress.index === 0 || undefined} className="aria-disabled:opacity-55" onClick={progress.previous} />
            {reducedMotion ? null : (
              <IconButton
                label={progress.paused ? labels.resume : labels.pause}
                icon={progress.paused ? <Play strokeWidth={1.5} /> : <Pause strokeWidth={1.5} />}
                variant="outlined"
                onClick={progress.toggle}
              />
            )}
            <IconButton label={labels.next} icon={<ChevronRight strokeWidth={1.5} />} variant="outlined" onClick={progress.next} />
          </div>
          <Button variant="quiet" icon={<Flag aria-hidden strokeWidth={1.5} />} onClick={() => (part ? onReport(part, progress.index) : undefined)}>
            {labels.report}
          </Button>
        </div>
      </div>
    </DialogPrimitive.Content>
  );
}
