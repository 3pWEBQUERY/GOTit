"use client";

import { LoaderCircle } from "lucide-react";
import type { MouseEvent, ReactNode } from "react";
import { cn } from "../../cn";
import { Button } from "../actions/button";
import { UiLink } from "../../link/ui-link";

export interface PaginationProps {
  /** Text des Buttons, zum Beispiel «Weitere 24 laden». Ohne Angabe gibt es nichts mehr zu laden. */
  loadMoreLabel?: ReactNode;
  /** Bereich, zum Beispiel «1–24 von 48». Änderungen werden angesagt. */
  rangeText: ReactNode;
  /**
   * Adresse der nächsten Seite. Damit ist der Button ein Link: Die Seitenzahl
   * steht in der URL und es funktioniert ohne JavaScript.
   */
  href?: string;
  /** Lädt weitere Einträge. Bei einem Link kann die App das Ereignis abfangen und selbst nachladen. */
  onLoadMore?: (event: MouseEvent<HTMLElement>) => void;
  loading?: boolean;
  className?: string;
}

/** «Weitere laden» statt endlosem Scrollen (PRD 9.2): Der Footer bleibt erreichbar. */
export function Pagination({ loadMoreLabel, rangeText, href, onLoadMore, loading, className }: PaginationProps) {
  return (
    <div className={cn("flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-ink", className)}>
      {loadMoreLabel === undefined ? null : href ? (
        <Button asChild>
          <UiLink
            href={href}
            aria-busy={loading || undefined}
            onClick={(event) => {
              if (loading) event.preventDefault();
              else onLoadMore?.(event);
            }}
          >
            {loading ? <LoaderCircle aria-hidden className="animate-spin" strokeWidth={1.5} /> : null}
            <span className="text-center">{loadMoreLabel}</span>
          </UiLink>
        </Button>
      ) : (
        <Button loading={loading} onClick={onLoadMore}>
          {loadMoreLabel}
        </Button>
      )}
      <p role="status" className="tabular text-small text-ink-muted">
        {rangeText}
      </p>
    </div>
  );
}
