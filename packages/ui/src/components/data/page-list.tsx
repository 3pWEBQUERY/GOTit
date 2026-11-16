"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "../../cn";
import { UiLink } from "../../link/ui-link";

export interface PageListProps {
  /** Zugänglicher Name der Navigation, zum Beispiel «Seiten der Beispieltabelle». */
  label: string;
  /** Aktuelle Seite, beginnend bei 1. */
  page: number;
  pageCount: number;
  /** Adresse einer Seite. Damit sind die Einträge Links und die Seitenzahl steht in der URL. */
  getHref?: (page: number) => string;
  /** Ohne `getHref` sind die Einträge Buttons; mit beidem kann die App den Klick auf den Link abfangen. */
  onPageChange?: (page: number) => void;
  labels: {
    /** Zum Beispiel «Vorherige Seite». */
    previous: string;
    /** Zum Beispiel «Nächste Seite». */
    next: string;
    /** Zugänglicher Name eines Eintrags, zum Beispiel «Seite 3». */
    page: (page: number) => string;
  };
  /** Wie viele Seiten neben der aktuellen stehen. */
  siblings?: number;
  className?: string;
}

/** Seiten, die gezeigt werden; `null` steht für eine Lücke. Erste und letzte Seite sind immer dabei. */
export function pageItems(page: number, pageCount: number, siblings = 1): (number | null)[] {
  const items: (number | null)[] = [];
  for (let candidate = 1; candidate <= pageCount; candidate += 1) {
    const near = Math.abs(candidate - page) <= siblings;
    if (candidate === 1 || candidate === pageCount || near) items.push(candidate);
    else if (items[items.length - 1] !== null) items.push(null);
  }
  return items;
}

const itemClass = cn(
  "tabular inline-flex size-11 items-center justify-center rounded-control text-small font-[550] text-ink transition-colors duration-state",
  "hover:bg-surface-2 aria-[current=page]:bg-ink aria-[current=page]:text-bg aria-disabled:cursor-not-allowed aria-disabled:opacity-55 aria-disabled:hover:bg-transparent",
);

/** Klassische Seitennavigation für Tabellen im Admin. Auf der Suche steht stattdessen `Pagination`. */
export function PageList({ label, page, pageCount, getHref, onPageChange, labels, siblings = 1, className }: PageListProps) {
  if (pageCount < 1) return null;

  function entry(target: number, name: string, content: ReactNode, options: { current?: boolean; disabled?: boolean }) {
    if (options.disabled) {
      return (
        <span role="link" aria-disabled="true" aria-label={name} className={itemClass}>
          {content}
        </span>
      );
    }
    const shared = { "aria-label": name, "aria-current": options.current ? ("page" as const) : undefined, className: itemClass };
    if (getHref) {
      return (
        <UiLink href={getHref(target)} onClick={onPageChange ? () => onPageChange(target) : undefined} {...shared}>
          {content}
        </UiLink>
      );
    }
    return (
      <button type="button" onClick={() => onPageChange?.(target)} {...shared}>
        {content}
      </button>
    );
  }

  const items = pageItems(page, pageCount, siblings);
  return (
    <nav aria-label={label} className={className}>
      <ul className="flex flex-wrap items-center gap-1">
        <li>{entry(page - 1, labels.previous, <ChevronLeft aria-hidden strokeWidth={1.5} className="size-5" />, { disabled: page <= 1 })}</li>
        {items.map((item, index) => {
          if (item === null) {
            return (
              <li key={`gap-after-${items[index - 1] ?? 0}`} aria-hidden className="flex size-11 items-center justify-center text-ink-muted">
                …
              </li>
            );
          }
          return <li key={item}>{entry(item, labels.page(item), item, { current: item === page })}</li>;
        })}
        <li>{entry(page + 1, labels.next, <ChevronRight aria-hidden strokeWidth={1.5} className="size-5" />, { disabled: page >= pageCount })}</li>
      </ul>
    </nav>
  );
}
