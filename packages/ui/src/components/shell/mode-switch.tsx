import type { MouseEvent, ReactNode } from "react";
import { cn } from "../../cn";
import { UiLink } from "../../link/ui-link";

export interface ModeSegment {
  key: string;
  label: string;
  href: string;
  current: boolean;
}

export interface ModeSwitchProps {
  /** Zugänglicher Name der Gruppe, zum Beispiel «Bereich wechseln». */
  label: string;
  segments: readonly [ModeSegment, ModeSegment];
  /** Erlaubt der App, zur zuletzt besuchten Seite des Bereichs zu führen (PRD 8.1). */
  onSegmentClick?: (key: string, event: MouseEvent<HTMLAnchorElement>) => void;
  /** Kontextwahl «Mein Profil» oder Organisation, wenn jemand beides hat. */
  contextMenu?: ReactNode;
  className?: string;
}

/** Zwei Segmente: «Marktplatz» und «Studio». Ein Modus, kein Ortswechsel (PRD 6.1). */
export function ModeSwitch({ label, segments, onSegmentClick, contextMenu, className }: ModeSwitchProps) {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      <nav aria-label={label} className="inline-flex rounded-full bg-surface-2 p-1">
        {segments.map((segment) => (
          <UiLink
            key={segment.key}
            href={segment.href}
            aria-current={segment.current ? "page" : undefined}
            data-mode={segment.key}
            onClick={onSegmentClick ? (event) => onSegmentClick(segment.key, event) : undefined}
            className={cn(
              "inline-flex min-h-11 items-center rounded-full px-3 md:min-h-9 text-small font-[550] transition-colors duration-state",
              segment.current ? "bg-surface text-ink" : "text-ink-muted hover:text-ink",
            )}
          >
            {segment.label}
          </UiLink>
        ))}
      </nav>
      {contextMenu}
    </div>
  );
}
